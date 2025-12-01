// components/monitors/sections/TimingSection.tsx

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

export default function TimingSection({ formData, setFormData }: Props) {
    const handleNumberChange = (field: keyof Monitor) => (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const value = event.target.value ? parseFloat(event.target.value) : undefined;
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleChange = (field: keyof Monitor) => (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setFormData(prev => ({ ...prev, [field]: event.target.value }));
    };

    return (
        <>
            {/* Timing */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Timing & Behavior</Typography>
                    <Divider sx={{ mb: 3 }} />
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="number"
                                required
                                label="Check Period"
                                value={formData.period_in_minute}
                                onChange={handleNumberChange('period_in_minute')}
                                InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }}
                                inputProps={{ min: 1 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="number"
                                required
                                label="Timeout"
                                value={formData.timeout_in_second}
                                onChange={handleNumberChange('timeout_in_second')}
                                InputProps={{ endAdornment: <InputAdornment position="end">sec</InputAdornment> }}
                                inputProps={{ min: 5 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="number"
                                required
                                label="Consecutive Warnings"
                                value={formData.consecutive_warning}
                                onChange={handleNumberChange('consecutive_warning')}
                                inputProps={{ min: 1 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="number"
                                required
                                label="Consecutive Alarms"
                                value={formData.consecutive_alarm}
                                onChange={handleNumberChange('consecutive_alarm')}
                                inputProps={{ min: 1 }}
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Recovery */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Recovery & Notifications</Typography>
                    <Divider sx={{ mb: 3 }} />
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Recovery Action"
                                value={formData.recovery_action}
                                onChange={handleChange('recovery_action')}
                                helperText="Script or action name"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="number"
                                required
                                label="Alarm After N Failures"
                                value={formData.alarm_after_n_failure}
                                onChange={handleNumberChange('alarm_after_n_failure')}
                                inputProps={{ min: 1 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                type="number"
                                required
                                label="Reset After M OK"
                                value={formData.reset_after_m_ok}
                                onChange={handleNumberChange('reset_after_m_ok')}
                                inputProps={{ min: 1 }}
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </>
    );
}
