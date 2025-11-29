// lib/monitoring/checkers/AzureChecker.ts

import { Monitor } from '@/lib/models/Monitor';
import { IChecker, CheckResult, createErrorResult } from '../types';
import { logger } from '@/lib/logger';
import axios from 'axios';

/**
 * AzureChecker
 * Monitors Microsoft Azure resources using Azure Monitor API
 * 
 * Supported Services:
 * - Virtual Machines
 * - App Services
 * - Azure Functions
 * - SQL Database
 * - Storage Accounts
 * - Kubernetes (AKS)
 * - Application Insights
 * 
 * Features:
 * - Real-time metrics monitoring
 * - Multi-metric aggregation
 * - AI-powered root cause analysis
 * - Cost optimization suggestions
 */
export class AzureChecker implements IChecker {
    readonly type = 'azure';

    async check(monitor: Monitor): Promise<CheckResult> {
        const startTime = Date.now();

        try {
            const config = this.parseAzureConfig(monitor);

            if (!config.valid) {
                return {
                    success: false,
                    value: null,
                    status: 'error',
                    message: config.error || 'Invalid Azure configuration',
                    timestamp: new Date()
                };
            }

            logger.info(`☁️ Checking Azure resource: ${config.resourceType}/${config.resourceName}`);

            // Get access token
            const accessToken = await this.getAccessToken(config);

            // Fetch metrics
            const metrics = await this.fetchMetrics(accessToken, config);

            // Analyze metrics
            const analysis = await this.analyzeMetrics(metrics, config);

            const responseTime = Date.now() - startTime;

            // Determine status
            let status: 'ok' | 'warning' | 'alarm' = 'ok';
            if (analysis.criticalIssues > 0) {
                status = 'alarm';
            } else if (analysis.warnings > 0) {
                status = 'warning';
            }

            return {
                success: status !== 'alarm',
                value: analysis.primaryMetricValue,
                status,
                message: analysis.message,
                responseTime,
                metadata: {
                    service: config.resourceType,
                    resourceName: config.resourceName,
                    metrics: analysis.metrics,
                    issues: analysis.issues,
                    recommendations: analysis.recommendations,
                    aiAnalysis: analysis.aiAnalysis,
                    costInsights: analysis.costInsights
                },
                timestamp: new Date()
            };

        } catch (error: any) {
            logger.error('❌ Azure Check Failed:', error);
            return createErrorResult(error, Date.now() - startTime);
        }
    }

    validate(monitor: Monitor): boolean | string {
        const azure = (monitor as any).azure_config;

        if (!azure) return 'Azure configuration is required';
        if (!azure.subscription_id) return 'Subscription ID is required';
        if (!azure.resource_group) return 'Resource group is required';
        if (!azure.resource_type) return 'Resource type is required';
        if (!azure.resource_name) return 'Resource name is required';
        if (!azure.tenant_id) return 'Tenant ID is required';
        if (!azure.client_id) return 'Client ID is required';
        if (!azure.client_secret) return 'Client secret is required';

        return true;
    }

    private parseAzureConfig(monitor: Monitor) {
        const azure = (monitor as any).azure_config;

        if (!azure) {
            return {
                valid: false,
                error: 'Azure config missing',
                subscriptionId: '',
                resourceGroup: '',
                resourceType: '',
                resourceName: ''
            };
        }

        return {
            valid: true,
            subscriptionId: azure.subscription_id,
            resourceGroup: azure.resource_group,
            resourceType: azure.resource_type, // VM, AppService, Function, etc.
            resourceName: azure.resource_name,
            tenantId: azure.tenant_id,
            clientId: azure.client_id,
            clientSecret: azure.client_secret,
            metricNames: azure.metric_names || this.getDefaultMetrics(azure.resource_type),
            thresholds: azure.thresholds || {}
        };
    }

    private getDefaultMetrics(resourceType: string): string[] {
        const metricMap: Record<string, string[]> = {
            vm: [
                'Percentage CPU',
                'Network In Total',
                'Network Out Total',
                'Disk Read Bytes',
                'Disk Write Bytes',
                'Available Memory Bytes'
            ],
            appservice: [
                'CpuPercentage',
                'MemoryPercentage',
                'HttpResponseTime',
                'Http5xx',
                'Requests'
            ],
            function: [
                'FunctionExecutionCount',
                'FunctionExecutionUnits',
                'Http5xx'
            ],
            sqldb: [
                'cpu_percent',
                'physical_data_read_percent',
                'log_write_percent',
                'dtu_consumption_percent',
                'connection_successful'
            ],
            aks: [
                'node_cpu_usage_percentage',
                'node_memory_working_set_percentage',
                'node_network_in_bytes',
                'node_network_out_bytes'
            ]
        };

        return metricMap[resourceType.toLowerCase()] || [];
    }

    private async getAccessToken(config: any): Promise<string> {
        try {
            const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;

            const response = await axios.post(
                tokenUrl,
                new URLSearchParams({
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                    scope: 'https://management.azure.com/.default',
                    grant_type: 'client_credentials'
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            return response.data.access_token;
        } catch (error: any) {
            throw new Error(`Failed to get Azure access token: ${error.message}`);
        }
    }

    private async fetchMetrics(accessToken: string, config: any): Promise<any> {
        const resourceId = `/subscriptions/${config.subscriptionId}/resourceGroups/${config.resourceGroup}/providers/${this.getResourceProvider(config.resourceType)}/${config.resourceName}`;

        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // Last 5 minutes

        const metricsUrl = `https://management.azure.com${resourceId}/providers/microsoft.insights/metrics`;

        const allMetrics: any = {};

        for (const metricName of config.metricNames) {
            try {
                const response = await axios.get(metricsUrl, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    },
                    params: {
                        'api-version': '2018-01-01',
                        metricnames: metricName,
                        timespan: `${startTime.toISOString()}/${endTime.toISOString()}`,
                        interval: 'PT1M',
                        aggregation: 'Average,Maximum,Minimum'
                    }
                });

                if (response.data.value && response.data.value.length > 0) {
                    allMetrics[metricName] = this.processMetricData(response.data.value[0]);
                }
            } catch (error: any) {
                logger.warn(`Failed to fetch metric ${metricName}:`, error.message);
            }
        }

        return allMetrics;
    }

    private getResourceProvider(resourceType: string): string {
        const providerMap: Record<string, string> = {
            vm: 'Microsoft.Compute/virtualMachines',
            appservice: 'Microsoft.Web/sites',
            function: 'Microsoft.Web/sites',
            sqldb: 'Microsoft.Sql/servers/databases',
            storage: 'Microsoft.Storage/storageAccounts',
            aks: 'Microsoft.ContainerService/managedClusters'
        };

        return providerMap[resourceType.toLowerCase()] || 'Microsoft.Compute/virtualMachines';
    }

    private processMetricData(metricData: any): any {
        const timeseries = metricData.timeseries?.[0]?.data || [];

        if (timeseries.length === 0) {
            return { current: 0, average: 0, max: 0, min: 0, samples: 0 };
        }

        const values = timeseries
            .map((t: any) => t.average || t.total || 0)
            .filter((v: number) => v !== null);

        if (values.length === 0) {
            return { current: 0, average: 0, max: 0, min: 0, samples: 0 };
        }

        return {
            current: values[values.length - 1] || 0,
            average: values.reduce((a: number, b: number) => a + b, 0) / values.length,
            max: Math.max(...values),
            min: Math.min(...values),
            samples: values.length,
            trend: this.calculateTrend(values),
            unit: metricData.unit
        };
    }

    private calculateTrend(values: number[]): string {
        if (values.length < 2) return 'stable';

        const recent = values.slice(-Math.ceil(values.length / 2));
        const older = values.slice(0, Math.floor(values.length / 2));

        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

        const change = ((recentAvg - olderAvg) / olderAvg) * 100;

        if (change > 10) return 'increasing';
        if (change < -10) return 'decreasing';
        return 'stable';
    }

    private async analyzeMetrics(metrics: any, config: any): Promise<any> {
        const issues: string[] = [];
        const recommendations: string[] = [];
        const costInsights: string[] = [];
        let criticalIssues = 0;
        let warnings = 0;
        let primaryMetricValue = 0;

        // Analyze CPU
        const cpuMetric = this.findMetric(metrics, 'cpu');
        if (cpuMetric) {
            primaryMetricValue = cpuMetric.current;

            if (cpuMetric.current > 90) {
                criticalIssues++;
                issues.push(`Critical: CPU at ${cpuMetric.current.toFixed(1)}%`);
                recommendations.push('Scale up VM size or add instances');
                costInsights.push('High CPU may indicate need for larger VM tier');
            } else if (cpuMetric.current > 75) {
                warnings++;
                issues.push(`Warning: CPU at ${cpuMetric.current.toFixed(1)}%`);
                recommendations.push('Monitor CPU usage, consider auto-scaling');
            } else if (cpuMetric.current < 20 && cpuMetric.average < 30) {
                costInsights.push('Low CPU usage - consider downsizing to save costs');
            }
        }

        // Analyze Memory
        const memoryMetric = this.findMetric(metrics, 'memory');
        if (memoryMetric) {
            if (memoryMetric.current > 90) {
                criticalIssues++;
                issues.push(`Critical: Memory at ${memoryMetric.current.toFixed(1)}%`);
                recommendations.push('Increase memory or investigate memory leaks');
            } else if (memoryMetric.current > 80) {
                warnings++;
                issues.push(`Warning: Memory at ${memoryMetric.current.toFixed(1)}%`);
            }
        }

        // Analyze HTTP errors (for App Service)
        const http5xxMetric = this.findMetric(metrics, '5xx');
        if (http5xxMetric && http5xxMetric.current > 0) {
            criticalIssues++;
            issues.push(`Critical: ${http5xxMetric.current} HTTP 5xx errors`);
            recommendations.push('Check application logs for error details');
        }

        // Analyze Response Time
        const responseTimeMetric = this.findMetric(metrics, 'response');
        if (responseTimeMetric) {
            if (responseTimeMetric.average > 5000) {
                criticalIssues++;
                issues.push(`Critical: Avg response time ${responseTimeMetric.average.toFixed(0)}ms`);
                recommendations.push('Optimize database queries and API calls');
            } else if (responseTimeMetric.average > 2000) {
                warnings++;
                issues.push(`Warning: Avg response time ${responseTimeMetric.average.toFixed(0)}ms`);
            }
        }

        // Generate AI analysis
        const aiAnalysis = await this.generateAIAnalysis({
            metrics,
            issues,
            config,
            resourceType: config.resourceType
        });

        const message = issues.length > 0
            ? issues.join('; ')
            : `All metrics healthy - CPU: ${primaryMetricValue.toFixed(1)}%`;

        return {
            primaryMetricValue,
            message,
            criticalIssues,
            warnings,
            metrics,
            issues,
            recommendations,
            costInsights,
            aiAnalysis
        };
    }

    private findMetric(metrics: any, keyword: string): any {
        for (const [key, value] of Object.entries(metrics)) {
            if (key.toLowerCase().includes(keyword.toLowerCase())) {
                return value;
            }
        }
        return null;
    }

    private async generateAIAnalysis(context: any): Promise<string> {
        try {
            const { analyzeMetricsWithAI } = await import('@/lib/ai/metricAnalyzer');
            return await analyzeMetricsWithAI(context);
        } catch (error) {
            logger.warn('AI analysis not available:', error);
            return 'AI analysis unavailable';
        }
    }
}