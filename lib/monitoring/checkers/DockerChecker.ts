// lib/checkers/DockerChecker.ts

import { IChecker, CheckResult, createErrorResult, determineStatus } from '../types';
import { Monitor } from '@/lib/models/Monitor';
import { Client } from 'ssh2';
import Docker from 'dockerode';

interface DockerConfig {
    connection_type: 'local' | 'remote' | 'tcp';

    // For remote SSH connection
    ssh_host?: string;
    ssh_port?: number;
    ssh_username?: string;
    ssh_password?: string;
    ssh_private_key?: string;
    ssh_passphrase?: string;

    // For TCP connection (Docker API)
    docker_host?: string;  // e.g., tcp://192.168.1.100:2375
    docker_port?: number;
    docker_tls?: boolean;
    docker_cert_path?: string;

    // Container identification
    container_name?: string;  // Specific container name
    container_id?: string;    // Specific container ID
    image_name?: string;      // Monitor all containers from image

    // What to check
    check_status?: boolean;      // Check if running
    check_health?: boolean;      // Check health status
    check_restart_count?: boolean;  // Check restart count
    check_cpu?: boolean;         // Check CPU usage
    check_memory?: boolean;      // Check memory usage
    check_disk?: boolean;        // Check disk usage
    check_network?: boolean;     // Check network stats

    // Thresholds
    max_restart_count?: number;
    cpu_warning?: number;        // % CPU usage
    cpu_critical?: number;
    memory_warning?: number;     // % Memory usage
    memory_critical?: number;
    disk_warning?: number;       // MB disk usage
    disk_critical?: number;
}

interface ContainerStats {
    name: string;
    id: string;
    status: string;
    health?: string;
    restartCount: number;
    cpuPercent: number;
    memoryPercent: number;
    memoryUsageMB: number;
    memoryLimitMB: number;
    diskUsageMB: number;
    networkRxMB: number;
    networkTxMB: number;
    uptime: string;
    image: string;
}

export class DockerChecker implements IChecker {
    type = 'docker';

    validate(monitor: Monitor): boolean | string {
        if (!monitor.docker_config) {
            return 'Docker configuration is missing';
        }
        if (!monitor.docker_config.connection_type) {
            return 'Connection type is required';
        }
        return true;
    }

    private docker: Docker | null = null;

    async check(monitor: Monitor): Promise<CheckResult> {
        const startTime = Date.now();
        const config = (monitor as any).docker_config as DockerConfig;

        if (!config) {
            return this.createErrorResult(monitor, 'Docker configuration is missing', startTime);
        }

        try {
            // Connect to Docker
            await this.connectDocker(config);

            if (!this.docker) {
                return this.createErrorResult(monitor, 'Failed to connect to Docker', startTime);
            }

            // Get container stats
            const stats = await this.getContainerStats(config);

            if (!stats || stats.length === 0) {
                return this.createErrorResult(
                    monitor,
                    `No containers found matching criteria`,
                    startTime
                );
            }

            // Analyze stats and determine status
            const analysis = this.analyzeStats(stats, config);

            let status: 'ok' | 'warning' | 'alarm' = 'ok';
            if (analysis.summary.critical_issues > 0) status = 'alarm';
            else if (analysis.summary.warning_issues > 0) status = 'warning';

            return {
                success: analysis.success,
                message: analysis.message,
                value: analysis.value,
                responseTime: Date.now() - startTime,
                statusCode: analysis.success ? 200 : 500,
                status,
                timestamp: new Date(),
                metadata: {
                    containers: stats,
                    summary: analysis.summary,
                    issues: analysis.issues,
                    checked_at: new Date().toISOString(),
                },
            };
        } catch (error: any) {
            return this.createErrorResult(
                monitor,
                `Docker check failed: ${error.message}`,
                startTime
            );
        } finally {
            this.disconnect();
        }
    }

    private async connectDocker(config: DockerConfig): Promise<void> {
        if (config.connection_type === 'local') {
            // Connect to local Docker daemon
            const socketPath = process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock';
            this.docker = new Docker({ socketPath });
        } else if (config.connection_type === 'tcp') {
            // Connect via TCP (Docker API)
            const dockerOptions: any = {
                host: config.docker_host || 'localhost',
                port: config.docker_port || 2375,
            };

            if (config.docker_tls) {
                dockerOptions.protocol = 'https';
                dockerOptions.ca = config.docker_cert_path;
            }

            this.docker = new Docker(dockerOptions);
        } else if (config.connection_type === 'remote') {
            // For remote SSH, we'll execute docker commands via SSH
            // This is handled separately in executeRemoteDockerCommand
            return;
        }

        // Test connection
        try {
            await this.docker!.ping();
        } catch (error: any) {
            throw new Error(`Cannot connect to Docker daemon: ${error.message}`);
        }
    }

    private async getContainerStats(config: DockerConfig): Promise<ContainerStats[]> {
        const stats: ContainerStats[] = [];

        if (config.connection_type === 'remote') {
            // Get stats via SSH
            return this.getRemoteContainerStats(config);
        }

        // Get container list
        const containers = await this.docker!.listContainers({ all: true });

        // Filter containers based on config
        const filteredContainers = containers.filter((container) => {
            if (config.container_name && !container.Names.some(name => name.includes(config.container_name!))) {
                return false;
            }
            if (config.container_id && !container.Id.startsWith(config.container_id!)) {
                return false;
            }
            if (config.image_name && !container.Image.includes(config.image_name!)) {
                return false;
            }
            return true;
        });

        // Get detailed stats for each container
        for (const containerInfo of filteredContainers) {
            const container = this.docker!.getContainer(containerInfo.Id);
            const inspect = await container.inspect();

            // Get resource stats
            let cpuPercent = 0;
            let memoryPercent = 0;
            let memoryUsageMB = 0;
            let memoryLimitMB = 0;
            let networkRxMB = 0;
            let networkTxMB = 0;

            if (inspect.State.Running) {
                try {
                    const statsStream = await container.stats({ stream: false });

                    // Calculate CPU percentage
                    const cpuDelta = statsStream.cpu_stats.cpu_usage.total_usage -
                        statsStream.precpu_stats.cpu_usage.total_usage;
                    const systemDelta = statsStream.cpu_stats.system_cpu_usage -
                        statsStream.precpu_stats.system_cpu_usage;
                    const numCPUs = statsStream.cpu_stats.online_cpus || 1;

                    if (systemDelta > 0 && cpuDelta > 0) {
                        cpuPercent = (cpuDelta / systemDelta) * numCPUs * 100;
                    }

                    // Calculate memory
                    memoryUsageMB = statsStream.memory_stats.usage / 1024 / 1024;
                    memoryLimitMB = statsStream.memory_stats.limit / 1024 / 1024;
                    memoryPercent = (memoryUsageMB / memoryLimitMB) * 100;

                    // Calculate network
                    if (statsStream.networks) {
                        const networkStats = Object.values(statsStream.networks) as any[];
                        networkRxMB = networkStats.reduce((sum, net) => sum + (net.rx_bytes || 0), 0) / 1024 / 1024;
                        networkTxMB = networkStats.reduce((sum, net) => sum + (net.tx_bytes || 0), 0) / 1024 / 1024;
                    }
                } catch (error) {
                    console.error(`Failed to get stats for container ${containerInfo.Names[0]}:`, error);
                }
            }

            // Calculate uptime
            const startedAt = new Date(inspect.State.StartedAt);
            const uptime = inspect.State.Running
                ? this.formatUptime(Date.now() - startedAt.getTime())
                : 'Not running';

            stats.push({
                name: containerInfo.Names[0].replace('/', ''),
                id: containerInfo.Id.substring(0, 12),
                status: inspect.State.Status,
                health: inspect.State.Health?.Status,
                restartCount: inspect.RestartCount || 0,
                cpuPercent: Math.round(cpuPercent * 100) / 100,
                memoryPercent: Math.round(memoryPercent * 100) / 100,
                memoryUsageMB: Math.round(memoryUsageMB * 100) / 100,
                memoryLimitMB: Math.round(memoryLimitMB * 100) / 100,
                diskUsageMB: 0, // Would need to parse docker system df
                networkRxMB: Math.round(networkRxMB * 100) / 100,
                networkTxMB: Math.round(networkTxMB * 100) / 100,
                uptime,
                image: containerInfo.Image,
            });
        }

        return stats;
    }

    private async getRemoteContainerStats(config: DockerConfig): Promise<ContainerStats[]> {
        return new Promise((resolve, reject) => {
            const conn = new Client();
            const stats: ContainerStats[] = [];

            conn.on('ready', () => {
                // Build docker command
                let dockerCmd = 'docker ps -a --format "{{.ID}}|{{.Names}}|{{.Status}}|{{.Image}}" ';

                if (config.container_name) {
                    dockerCmd += `--filter "name=${config.container_name}" `;
                }
                if (config.image_name) {
                    dockerCmd += `--filter "ancestor=${config.image_name}" `;
                }

                conn.exec(dockerCmd, (err, stream) => {
                    if (err) {
                        conn.end();
                        return reject(err);
                    }

                    let output = '';
                    stream.on('data', (data: Buffer) => {
                        output += data.toString();
                    });

                    stream.on('close', async () => {
                        const lines = output.trim().split('\n').filter(l => l);

                        for (const line of lines) {
                            const [id, name, status, image] = line.split('|');

                            // Get detailed stats for this container
                            const detailCmd = `docker inspect ${id} --format '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}|{{.RestartCount}}' && docker stats ${id} --no-stream --format '{{.CPUPerc}}|{{.MemPerc}}|{{.MemUsage}}'`;

                            await new Promise<void>((resolveDetail) => {
                                conn.exec(detailCmd, (err2, stream2) => {
                                    if (err2) {
                                        resolveDetail();
                                        return;
                                    }

                                    let detailOutput = '';
                                    stream2.on('data', (data: Buffer) => {
                                        detailOutput += data.toString();
                                    });

                                    stream2.on('close', () => {
                                        const [inspectLine, statsLine] = detailOutput.trim().split('\n');
                                        const [containerStatus, health, restartCount] = inspectLine.split('|');
                                        const [cpu, mem, memUsage] = (statsLine || '||').split('|');

                                        stats.push({
                                            name,
                                            id: id.substring(0, 12),
                                            status: containerStatus || 'unknown',
                                            health: health !== 'none' ? health : undefined,
                                            restartCount: parseInt(restartCount) || 0,
                                            cpuPercent: parseFloat(cpu?.replace('%', '') || '0'),
                                            memoryPercent: parseFloat(mem?.replace('%', '') || '0'),
                                            memoryUsageMB: this.parseMemoryUsage(memUsage),
                                            memoryLimitMB: 0,
                                            diskUsageMB: 0,
                                            networkRxMB: 0,
                                            networkTxMB: 0,
                                            uptime: status,
                                            image,
                                        });

                                        resolveDetail();
                                    });
                                });
                            });
                        }

                        conn.end();
                        resolve(stats);
                    });
                });
            });

            conn.on('error', (err) => {
                reject(err);
            });

            // Connect
            const connectOptions: any = {
                host: config.ssh_host,
                port: config.ssh_port || 22,
                username: config.ssh_username,
            };

            if (config.ssh_private_key) {
                connectOptions.privateKey = config.ssh_private_key;
                if (config.ssh_passphrase) {
                    connectOptions.passphrase = config.ssh_passphrase;
                }
            } else {
                connectOptions.password = config.ssh_password;
            }

            conn.connect(connectOptions);
        });
    }

    private analyzeStats(stats: ContainerStats[], config: DockerConfig) {
        const issues: string[] = [];
        let totalValue = 0;
        let criticalCount = 0;
        let warningCount = 0;

        for (const stat of stats) {
            // Check container status
            if (config.check_status !== false) {
                if (stat.status !== 'running') {
                    issues.push(`❌ Container ${stat.name} is ${stat.status}`);
                    criticalCount++;
                }
            }

            // Check health
            if (config.check_health && stat.health) {
                if (stat.health === 'unhealthy') {
                    issues.push(`🏥 Container ${stat.name} is unhealthy`);
                    criticalCount++;
                } else if (stat.health === 'starting') {
                    issues.push(`⏳ Container ${stat.name} is still starting`);
                    warningCount++;
                }
            }

            // Check restart count
            if (config.check_restart_count && config.max_restart_count) {
                if (stat.restartCount > config.max_restart_count) {
                    issues.push(`🔄 Container ${stat.name} has restarted ${stat.restartCount} times`);
                    warningCount++;
                }
            }

            // Check CPU
            if (config.check_cpu) {
                if (config.cpu_critical && stat.cpuPercent > config.cpu_critical) {
                    issues.push(`🔥 Container ${stat.name} CPU usage: ${stat.cpuPercent}% (critical)`);
                    criticalCount++;
                } else if (config.cpu_warning && stat.cpuPercent > config.cpu_warning) {
                    issues.push(`⚠️ Container ${stat.name} CPU usage: ${stat.cpuPercent}% (warning)`);
                    warningCount++;
                }
            }

            // Check Memory
            if (config.check_memory) {
                if (config.memory_critical && stat.memoryPercent > config.memory_critical) {
                    issues.push(`💾 Container ${stat.name} Memory usage: ${stat.memoryPercent}% (critical)`);
                    criticalCount++;
                } else if (config.memory_warning && stat.memoryPercent > config.memory_warning) {
                    issues.push(`⚠️ Container ${stat.name} Memory usage: ${stat.memoryPercent}% (warning)`);
                    warningCount++;
                }
            }

            // Calculate average value (for graphing)
            totalValue += stat.cpuPercent + stat.memoryPercent;
        }

        const avgValue = stats.length > 0 ? totalValue / (stats.length * 2) : 0;

        const success = criticalCount === 0 && warningCount === 0;

        let message = '';
        if (success) {
            message = `✅ All ${stats.length} container(s) are healthy`;
        } else {
            message = `🚨 Found ${criticalCount} critical and ${warningCount} warning issue(s) across ${stats.length} container(s)`;
        }

        return {
            success,
            message,
            value: Math.round(avgValue * 100) / 100,
            summary: {
                total_containers: stats.length,
                running: stats.filter(s => s.status === 'running').length,
                stopped: stats.filter(s => s.status !== 'running').length,
                healthy: stats.filter(s => s.health === 'healthy').length,
                unhealthy: stats.filter(s => s.health === 'unhealthy').length,
                critical_issues: criticalCount,
                warning_issues: warningCount,
            },
            issues,
        };
    }

    private formatUptime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    private parseMemoryUsage(memStr: string): number {
        if (!memStr) return 0;

        // Parse formats like "1.5GiB / 4GiB" or "512MiB / 2GiB"
        const match = memStr.match(/^([\d.]+)([KMGT]i?B)/);
        if (!match) return 0;

        const value = parseFloat(match[1]);
        const unit = match[2];

        const multipliers: { [key: string]: number } = {
            'KiB': 1024,
            'MiB': 1024 * 1024,
            'GiB': 1024 * 1024 * 1024,
            'KB': 1000,
            'MB': 1000 * 1000,
            'GB': 1000 * 1000 * 1000,
        };

        return (value * (multipliers[unit] || 1)) / (1024 * 1024); // Convert to MB
    }

    private disconnect(): void {
        this.docker = null;
    }

    private createErrorResult(monitor: Monitor, message: string, startTime: number): CheckResult {
        return {
            success: false,
            message,
            value: 0,
            responseTime: Date.now() - startTime,
            statusCode: 500,
            status: 'error',
            timestamp: new Date(),
            metadata: {
                error: message,
                monitor_type: 'docker',
                checked_at: new Date().toISOString(),
            },
        };
    }
}