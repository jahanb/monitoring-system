// components/monitors/sections/ThresholdsSection.tsx

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

export default function ThresholdsSection({ formData, setFormData }: Props) {
    const handleNumberChange = (field: keyof Monitor) => (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const value = event.target.value ? parseFloat(event.target.value) : undefined;
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const getUnit = () => {
        if (formData.monitor_type === 'certificate') return 'days';
        if (['url', 'api_post', 'ping'].includes(formData.monitor_type || '')) return 'ms';
        return '%';
    };

    const unit = getUnit();

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Thresholds
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Low Warning"
                            value={formData.low_value_threshold_warning || ''}
                            onChange={handleNumberChange('low_value_threshold_warning')}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">{unit}</InputAdornment>
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="High Warning"
                            value={formData.high_value_threshold_warning || ''}
                            onChange={handleNumberChange('high_value_threshold_warning')}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">{unit}</InputAdornment>
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Low Alarm"
                            value={formData.low_value_threshold_alarm || ''}
                            onChange={handleNumberChange('low_value_threshold_alarm')}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">{unit}</InputAdornment>
                            }}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="High Alarm"
                            value={formData.high_value_threshold_alarm || ''}
                            onChange={handleNumberChange('high_value_threshold_alarm')}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">{unit}</InputAdornment>
                            }}
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}