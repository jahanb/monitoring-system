// components/monitors/sections/StatusSection.tsx

import {
    Card,
    CardContent,
    Typography,
    Divider,
    Grid,
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

export default function StatusSection({ formData, setFormData }: Props) {
    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Monitor Status
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Active Status</InputLabel>
                            <Select
                                value={formData.active_disable ? 'active' : 'disabled'}
                                label="Active Status"
                                onChange={(e) =>
                                    setFormData(p => ({ ...p, active_disable: e.target.value === 'active' }))
                                }
                            >
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="disabled">Disabled</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Running Status</InputLabel>
                            <Select
                                value={formData.running_stopped ? 'running' : 'stopped'}
                                label="Running Status"
                                onChange={(e) =>
                                    setFormData(p => ({ ...p, running_stopped: e.target.value === 'running' }))
                                }
                            >
                                <MenuItem value="running">Running</MenuItem>
                                <MenuItem value="stopped">Stopped</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}