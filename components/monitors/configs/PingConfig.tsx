// components/monitors/configs/PingConfig.tsx

import {
    Card,
    CardContent,
    Typography,
    Divider,
    Grid,
    TextField,
    InputAdornment
} from '@mui/material';
import { Monitor } from '@/lib/models/Monitor';

interface Props {
    formData: Partial<Monitor>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Monitor>>>;
}

export default function PingConfig({ formData, setFormData }: Props) {
    const config = (formData as any).ping_config || {};

    const updateConfig = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            ping_config: { ...(prev as any).ping_config, [field]: value }
        }));
    };

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>Ping / ICMP Configuration</Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        <TextField
                            fullWidth
                            required
                            label="Host / IP Address"
                            value={config.host || formData.monitor_instance || ''}
                            onChange={(e) => {
                                const host = e.target.value;
                                updateConfig('host', host);
                                setFormData(prev => ({ ...prev, monitor_instance: host }));
                            }}
                            placeholder="8.8.8.8 or google.com"
                            helperText="Hostname or IP address to ping"
                        />
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Packet Count"
                            value={config.count || 3}
                            onChange={(e) => updateConfig('count', parseInt(e.target.value) || 3)}
                            helperText="Number of pings to send"
                            inputProps={{ min: 1, max: 20 }}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Timeout (ms)"
                            value={config.timeout || 1000}
                            onChange={(e) => updateConfig('timeout', parseInt(e.target.value) || 1000)}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">ms</InputAdornment>
                            }}
                            helperText="Timeout per packet"
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}
