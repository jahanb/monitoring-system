// components/monitors/configs/SSHConfig.tsx

import {
    Card, CardContent, Typography, Divider, Grid, TextField,
    FormControl, InputLabel, Select, MenuItem, Alert
} from '@mui/material';
import { Monitor } from '@/lib/models/Monitor';

interface Props {
    formData: Partial<Monitor>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Monitor>>>;
}

export default function SSHConfig({ formData, setFormData }: Props) {
    const config = (formData as any).ssh_config || {};

    const updateConfig = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            ssh_config: { ...(prev as any).ssh_config, [field]: value }
        }));
    };

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>SSH Configuration</Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            required
                            label="Host / IP Address"
                            value={config.host || ''}
                            onChange={(e) => {
                                const host = e.target.value;
                                updateConfig('host', host);
                                setFormData(prev => ({ ...prev, monitor_instance: host }));
                            }}
                            placeholder="192.168.1.100"
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Port"
                            value={config.port || 22}
                            onChange={(e) => updateConfig('port', parseInt(e.target.value))}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            required
                            label="Username"
                            value={config.username || ''}
                            onChange={(e) => updateConfig('username', e.target.value)}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth required>
                            <InputLabel>Authentication Method</InputLabel>
                            <Select
                                value={config.auth_method || 'password'}
                                label="Authentication Method"
                                onChange={(e) => updateConfig('auth_method', e.target.value)}
                            >
                                <MenuItem value="password">🔑 Password</MenuItem>
                                <MenuItem value="privatekey">🔐 SSH Private Key</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {config.auth_method === 'password' && (
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                required
                                type="password"
                                label="Password"
                                value={config.password || ''}
                                onChange={(e) => updateConfig('password', e.target.value)}
                            />
                        </Grid>
                    )}

                    {config.auth_method === 'privatekey' && (
                        <>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    required
                                    multiline
                                    rows={8}
                                    label="SSH Private Key"
                                    value={config.private_key || ''}
                                    onChange={(e) => updateConfig('private_key', e.target.value)}
                                    placeholder="-----BEGIN RSA PRIVATE KEY-----"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    type="password"
                                    label="Passphrase (Optional)"
                                    value={config.passphrase || ''}
                                    onChange={(e) => updateConfig('passphrase', e.target.value)}
                                />
                            </Grid>
                        </>
                    )}

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            required
                            label="Command or Script Path"
                            value={config.command || ''}
                            onChange={(e) => updateConfig('command', e.target.value)}
                            placeholder="/opt/scripts/check.sh"
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}