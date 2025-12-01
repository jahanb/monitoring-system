// components/monitors/configs/DockerConfig.tsx

import {
    Card,
    CardContent,
    Typography,
    Divider,
    Grid,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Alert,
    Box,
    InputAdornment
} from '@mui/material';
import { Monitor } from '@/lib/models/Monitor';

interface Props {
    formData: Partial<Monitor>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Monitor>>>;
}

export default function DockerConfig({ formData, setFormData }: Props) {
    const config = (formData as any).docker_config || {};

    const updateConfig = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            docker_config: { ...(prev as any).docker_config, [field]: value }
        }));
    };

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">🐳 Docker Container Monitoring</Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Alert severity="info">
                            Monitor Docker containers - status, health, resource usage (CPU, memory), restart counts
                        </Alert>
                    </Grid>

                    {/* Connection Type */}
                    <Grid item xs={12}>
                        <FormControl fullWidth required>
                            <InputLabel>Connection Type</InputLabel>
                            <Select
                                value={config.connection_type || 'local'}
                                label="Connection Type"
                                onChange={(e) => updateConfig('connection_type', e.target.value)}
                            >
                                <MenuItem value="local">🖥️ Local Docker Daemon</MenuItem>
                                <MenuItem value="remote">🌐 Remote Server (SSH)</MenuItem>
                                <MenuItem value="tcp">🔌 Docker API (TCP)</MenuItem>
                            </Select>
                            <FormHelperText>Where is Docker running?</FormHelperText>
                        </FormControl>
                    </Grid>

                    {/* Remote SSH */}
                    {config.connection_type === 'remote' && (
                        <>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    required
                                    label="SSH Host"
                                    value={config.ssh_host || ''}
                                    onChange={(e) => updateConfig('ssh_host', e.target.value)}
                                    placeholder="192.168.1.100"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="SSH Port"
                                    value={config.ssh_port || 22}
                                    onChange={(e) => updateConfig('ssh_port', parseInt(e.target.value))}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    required
                                    label="SSH Username"
                                    value={config.ssh_username || ''}
                                    onChange={(e) => updateConfig('ssh_username', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    required
                                    type="password"
                                    label="SSH Password"
                                    value={config.ssh_password || ''}
                                    onChange={(e) => updateConfig('ssh_password', e.target.value)}
                                />
                            </Grid>
                        </>
                    )}

                    {/* TCP */}
                    {config.connection_type === 'tcp' && (
                        <>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Docker Host"
                                    value={config.docker_host || ''}
                                    onChange={(e) => updateConfig('docker_host', e.target.value)}
                                    placeholder="192.168.1.100"
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Docker Port"
                                    value={config.docker_port || 2375}
                                    onChange={(e) => updateConfig('docker_port', parseInt(e.target.value))}
                                    helperText="2375 for HTTP, 2376 for HTTPS/TLS"
                                />
                            </Grid>
                        </>
                    )}

                    {/* Container Selection */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                            Container Selection (leave empty to monitor all)
                        </Typography>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Container Name"
                            value={config.container_name || ''}
                            onChange={(e) => {
                                const name = e.target.value;
                                updateConfig('container_name', name);
                                setFormData(prev => ({ ...prev, monitor_instance: name || 'all-containers' }));
                            }}
                            placeholder="nginx-proxy"
                        />
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Container ID"
                            value={config.container_id || ''}
                            onChange={(e) => updateConfig('container_id', e.target.value)}
                            placeholder="abc123"
                        />
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Image Name"
                            value={config.image_name || ''}
                            onChange={(e) => updateConfig('image_name', e.target.value)}
                            placeholder="nginx:latest"
                        />
                    </Grid>

                    {/* Monitoring Options */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                            What to Monitor
                        </Typography>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Check Status</InputLabel>
                            <Select
                                value={config.check_status !== false ? 'yes' : 'no'}
                                label="Check Status"
                                onChange={(e) => updateConfig('check_status', e.target.value === 'yes')}
                            >
                                <MenuItem value="yes">✅ Yes - Alert if not running</MenuItem>
                                <MenuItem value="no">❌ No</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Check Health</InputLabel>
                            <Select
                                value={config.check_health ? 'yes' : 'no'}
                                label="Check Health"
                                onChange={(e) => updateConfig('check_health', e.target.value === 'yes')}
                            >
                                <MenuItem value="yes">✅ Yes - Check healthcheck</MenuItem>
                                <MenuItem value="no">❌ No</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Check CPU</InputLabel>
                            <Select
                                value={config.check_cpu ? 'yes' : 'no'}
                                label="Check CPU"
                                onChange={(e) => updateConfig('check_cpu', e.target.value === 'yes')}
                            >
                                <MenuItem value="yes">✅ Yes</MenuItem>
                                <MenuItem value="no">❌ No</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Check Memory</InputLabel>
                            <Select
                                value={config.check_memory ? 'yes' : 'no'}
                                label="Check Memory"
                                onChange={(e) => updateConfig('check_memory', e.target.value === 'yes')}
                            >
                                <MenuItem value="yes">✅ Yes</MenuItem>
                                <MenuItem value="no">❌ No</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* CPU Thresholds */}
                    {config.check_cpu && (
                        <>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2">CPU Thresholds</Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Warning"
                                    value={config.cpu_warning || 70}
                                    onChange={(e) => updateConfig('cpu_warning', parseInt(e.target.value))}
                                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Critical"
                                    value={config.cpu_critical || 90}
                                    onChange={(e) => updateConfig('cpu_critical', parseInt(e.target.value))}
                                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                                />
                            </Grid>
                        </>
                    )}

                    {/* Memory Thresholds */}
                    {config.check_memory && (
                        <>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2">Memory Thresholds</Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Warning"
                                    value={config.memory_warning || 80}
                                    onChange={(e) => updateConfig('memory_warning', parseInt(e.target.value))}
                                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Critical"
                                    value={config.memory_critical || 95}
                                    onChange={(e) => updateConfig('memory_critical', parseInt(e.target.value))}
                                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                                />
                            </Grid>
                        </>
                    )}
                </Grid>
            </CardContent>
        </Card>
    );
}