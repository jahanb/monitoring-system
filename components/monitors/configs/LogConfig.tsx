// components/monitors/configs/LogConfig.tsx

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
    MenuItem
} from '@mui/material';
import { Monitor } from '@/lib/models/Monitor';

interface Props {
    formData: Partial<Monitor>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Monitor>>>;
}

export default function LogConfig({ formData, setFormData }: Props) {
    const config = (formData as any).log_config || {};

    const updateConfig = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            log_config: { ...(prev as any).log_config, [field]: value }
        }));
    };

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>Log File Analysis</Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            required
                            label="Log File Path"
                            value={config.log_path || ''}
                            onChange={(e) => updateConfig('log_path', e.target.value)}
                            helperText="Absolute path to the log file (e.g., /var/log/nginx/error.log)"
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Log Location</InputLabel>
                            <Select
                                value={config.is_remote ? 'remote' : 'local'}
                                label="Log Location"
                                onChange={(e) => updateConfig('is_remote', e.target.value === 'remote')}
                            >
                                <MenuItem value="local">Local File System</MenuItem>
                                <MenuItem value="remote">Remote Server (SSH)</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {config.is_remote && (
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

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Positive Pattern (Regex)"
                            value={formData.positive_pattern || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, positive_pattern: e.target.value }))}
                            helperText="Pattern that indicates success (optional)"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Negative Pattern (Regex)"
                            value={formData.negative_pattern || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, negative_pattern: e.target.value }))}
                            helperText="Pattern that indicates error (e.g., 'Error|Exception')"
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}
