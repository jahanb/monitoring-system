// components/monitors/sections/BasicInfoSection.tsx

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
    SelectChangeEvent
} from '@mui/material';
import { Monitor } from '@/lib/models/Monitor';

interface Props {
    formData: Partial<Monitor>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Monitor>>>;
}

export default function BasicInfoSection({ formData, setFormData }: Props) {
    const handleChange = (field: keyof Monitor) => (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
    ) => {
        setFormData(prev => ({ ...prev, [field]: event.target.value }));
    };

    const needsMonitorInstance =
        formData.monitor_type !== 'ssh' &&
        formData.monitor_type !== 'aws' &&
        formData.monitor_type !== 'certificate' &&
        formData.monitor_type !== 'log' &&
        formData.monitor_type !== 'docker';

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Basic Information
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            required
                            label="Monitor Name"
                            value={formData.monitor_name}
                            onChange={handleChange('monitor_name')}
                            helperText="Unique name for this monitor"
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth required>
                            <InputLabel>Monitor Type</InputLabel>
                            <Select
                                value={formData.monitor_type}
                                label="Monitor Type"
                                onChange={handleChange('monitor_type')}
                            >
                                <MenuItem value="url">URL / API Endpoint (GET)</MenuItem>
                                <MenuItem value="api_post">API POST Request</MenuItem>
                                <MenuItem value="certificate">🔒 SSL/TLS Certificate</MenuItem>
                                <MenuItem value="ssh">SSH Remote Command</MenuItem>
                                <MenuItem value="docker">🐳 Docker Container</MenuItem>
                                <MenuItem value="aws">☁️ AWS CloudWatch</MenuItem>
                                <MenuItem value="ping">🔍 Ping / ICMP</MenuItem>
                                <MenuItem value="log">📄 Log File Analysis</MenuItem>
                                <MenuItem value="cpu">CPU Usage</MenuItem>
                                <MenuItem value="memory">Memory Usage</MenuItem>
                                <MenuItem value="disk">Disk Usage</MenuItem>
                                <MenuItem value="custom">Custom</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            required
                            label="Created By"
                            value={formData.created_by}
                            onChange={handleChange('created_by')}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            required
                            label="Business Owner"
                            value={formData.business_owner}
                            onChange={handleChange('business_owner')}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth required>
                            <InputLabel>Severity</InputLabel>
                            <Select
                                value={formData.severity}
                                label="Severity"
                                onChange={handleChange('severity')}
                            >
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                                <MenuItem value="critical">Critical</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {needsMonitorInstance && (
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                required
                                label="Monitor Instance"
                                value={formData.monitor_instance}
                                onChange={handleChange('monitor_instance')}
                                helperText={
                                    formData.monitor_type === 'url' || formData.monitor_type === 'api_post'
                                        ? 'URL to monitor'
                                        : formData.monitor_type === 'ping'
                                            ? 'IP address or hostname to ping'
                                            : 'System name'
                                }
                                placeholder={
                                    formData.monitor_type === 'ping' ? 'e.g., 8.8.8.8 or google.com' : undefined
                                }
                            />
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Description"
                            value={formData.description}
                            onChange={handleChange('description')}
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}