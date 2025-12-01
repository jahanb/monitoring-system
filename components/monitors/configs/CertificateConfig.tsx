// components/monitors/configs/CertificateConfig.tsx

import {
    Card,
    CardContent,
    Typography,
    Divider,
    Grid,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Alert,
    Stack,
    Button,
    Box
} from '@mui/material';
import { Monitor } from '@/lib/models/Monitor';

interface Props {
    formData: Partial<Monitor>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Monitor>>>;
}

export default function CertificateConfig({ formData, setFormData }: Props) {
    const config = (formData as any).certificate_config || {};

    const updateConfig = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            certificate_config: { ...(prev as any).certificate_config, [field]: value }
        }));
    };

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">🔒 SSL/TLS Certificate Monitoring</Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Monitor SSL/TLS certificate expiration and get daily alerts when renewal is needed.
                            Perfect for preventing certificate expiration incidents.
                        </Alert>
                    </Grid>

                    {/* Hostname */}
                    <Grid item xs={12} md={8}>
                        <TextField
                            fullWidth
                            required
                            label="Hostname / Domain"
                            value={config.hostname || ''}
                            onChange={(e) => {
                                const hostname = e.target.value;
                                updateConfig('hostname', hostname);
                                setFormData(prev => ({ ...prev, monitor_instance: hostname }));
                            }}
                            placeholder="www.example.com"
                            helperText="Domain name or hostname to check (without https://)"
                        />
                    </Grid>

                    {/* Port */}
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Port"
                            value={config.port || 443}
                            onChange={(e) => updateConfig('port', parseInt(e.target.value) || 443)}
                            helperText="SSL/TLS port"
                            inputProps={{ min: 1, max: 65535 }}
                        />
                    </Grid>

                    {/* Warning Threshold */}
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Warning Threshold"
                            value={config.warning_threshold_days || 30}
                            onChange={(e) => updateConfig('warning_threshold_days', parseInt(e.target.value) || 30)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">days</InputAdornment>
                            }}
                            helperText="Send warning when expiring in X days"
                            inputProps={{ min: 1, max: 365 }}
                        />
                    </Grid>

                    {/* Alarm Threshold */}
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Alarm Threshold"
                            value={config.alarm_threshold_days || 7}
                            onChange={(e) => updateConfig('alarm_threshold_days', parseInt(e.target.value) || 7)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">days</InputAdornment>
                            }}
                            helperText="Send alarm when expiring in X days"
                            inputProps={{ min: 1, max: 90 }}
                        />
                    </Grid>

                    {/* Connection Timeout */}
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Connection Timeout"
                            value={config.timeout || 30}
                            onChange={(e) => updateConfig('timeout', parseInt(e.target.value) || 30)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">seconds</InputAdornment>
                            }}
                            helperText="Time to wait for connection"
                            inputProps={{ min: 5, max: 120 }}
                        />
                    </Grid>

                    {/* Check Certificate Chain */}
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Check Certificate Chain</InputLabel>
                            <Select
                                value={config.check_chain !== false ? 'yes' : 'no'}
                                label="Check Certificate Chain"
                                onChange={(e) => updateConfig('check_chain', e.target.value === 'yes')}
                            >
                                <MenuItem value="yes">Yes - Check entire chain</MenuItem>
                                <MenuItem value="no">No - Check only main cert</MenuItem>
                            </Select>
                            <FormHelperText>
                                Verify intermediate certificates too
                            </FormHelperText>
                        </FormControl>
                    </Grid>

                    {/* Daily Reminders Toggle */}
                    <Grid item xs={12}>
                        <Card variant="outlined" sx={{ p: 2, bgcolor: '#fef3c7' }}>
                            <FormControl fullWidth>
                                <InputLabel>Daily Reminder Notifications</InputLabel>
                                <Select
                                    value={(formData as any).alert_settings?.send_daily_reminder ? 'enabled' : 'disabled'}
                                    label="Daily Reminder Notifications"
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        alert_settings: {
                                            ...(prev as any).alert_settings,
                                            enabled: true,
                                            send_daily_reminder: e.target.value === 'enabled'
                                        }
                                    }))}
                                >
                                    <MenuItem value="enabled">
                                        📅 Enabled - Send daily alerts when critical
                                    </MenuItem>
                                    <MenuItem value="disabled">
                                        ❌ Disabled - Send alert only once
                                    </MenuItem>
                                </Select>
                                <FormHelperText>
                                    When certificate is within alarm threshold (&lt; {config.alarm_threshold_days || 7} days),
                                    send daily reminder emails to ensure timely renewal
                                </FormHelperText>
                            </FormControl>
                        </Card>
                    </Grid>

                    {/* Threshold Presets */}
                    <Grid item xs={12}>
                        <Alert severity="success">
                            <Typography variant="body2" gutterBottom>
                                <strong>📊 Recommended Threshold Presets:</strong>
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        updateConfig('warning_threshold_days', 30);
                                        updateConfig('alarm_threshold_days', 7);
                                        setFormData(prev => ({ ...prev, period_in_minute: 60 }));
                                    }}
                                >
                                    🔴 Production Critical (30/7 days)
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        updateConfig('warning_threshold_days', 45);
                                        updateConfig('alarm_threshold_days', 14);
                                        setFormData(prev => ({ ...prev, period_in_minute: 360 }));
                                    }}
                                >
                                    🟡 Standard (45/14 days)
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        updateConfig('warning_threshold_days', 15);
                                        updateConfig('alarm_threshold_days', 5);
                                        setFormData(prev => ({ ...prev, period_in_minute: 1440 }));
                                    }}
                                >
                                    🟢 Internal (15/5 days)
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        updateConfig('warning_threshold_days', 30);
                                        updateConfig('alarm_threshold_days', 7);
                                        setFormData(prev => ({ ...prev, period_in_minute: 720 }));
                                    }}
                                >
                                    🔵 Let's Encrypt (30/7 days)
                                </Button>
                            </Stack>
                        </Alert>
                    </Grid>

                    {/* Info Cards */}
                    <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                            <Typography variant="subtitle2" gutterBottom color="primary">
                                ✅ What Gets Checked
                            </Typography>
                            <Typography variant="caption" component="div" color="text.secondary">
                                <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                                    <li>Days until certificate expiration</li>
                                    <li>Certificate issuer and subject</li>
                                    <li>Subject Alternative Names (SANs)</li>
                                    <li>Certificate chain validity</li>
                                    <li>Hostname match verification</li>
                                    <li>Self-signed certificate detection</li>
                                </ul>
                            </Typography>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                            <Typography variant="subtitle2" gutterBottom color="error">
                                🚨 Alert Behavior
                            </Typography>
                            <Typography variant="caption" component="div" color="text.secondary">
                                <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                                    <li><strong>Warning:</strong> First alert at {config.warning_threshold_days || 30} days</li>
                                    <li><strong>Alarm:</strong> Escalates at {config.alarm_threshold_days || 7} days</li>
                                    <li><strong>Daily Reminders:</strong> When enabled, sends daily emails during alarm period</li>
                                    <li><strong>Expired:</strong> Immediate critical alert</li>
                                    <li><strong>Recovery:</strong> Notification sent when renewed</li>
                                </ul>
                            </Typography>
                        </Card>
                    </Grid>

                    {/* Testing Section */}
                    <Grid item xs={12}>
                        <Card variant="outlined" sx={{ p: 2, bgcolor: '#f0f9ff' }}>
                            <Typography variant="subtitle2" gutterBottom>
                                🧪 Test Before Saving
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                                Test the certificate connection to verify your configuration:
                            </Typography>
                            <code style={{
                                display: 'block',
                                padding: '8px',
                                background: '#1f2937',
                                color: '#f3f4f6',
                                borderRadius: '4px',
                                fontSize: '11px',
                                marginTop: '8px'
                            }}>
                                openssl s_client -connect {config.hostname || 'example.com'}:{config.port || 443} -servername {config.hostname || 'example.com'} &lt; /dev/null 2&gt;/dev/null | openssl x509 -noout -dates
                            </code>
                        </Card>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}
