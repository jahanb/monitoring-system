// components/monitors/configs/AWSConfig.tsx

import {
    Card,
    CardContent,
    Typography,
    Divider,
    Grid,
    TextField,
    Alert
} from '@mui/material';
import { Monitor } from '@/lib/models/Monitor';

interface Props {
    formData: Partial<Monitor>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Monitor>>>;
}

export default function AWSConfig({ formData, setFormData }: Props) {
    const config = (formData as any).aws_config || {};

    const updateConfig = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            aws_config: { ...(prev as any).aws_config, [field]: value }
        }));
    };

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>AWS CloudWatch Configuration</Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            required
                            label="Access Key ID"
                            value={config.access_key_id || ''}
                            onChange={(e) => updateConfig('access_key_id', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            required
                            type="password"
                            label="Secret Access Key"
                            value={config.secret_access_key || ''}
                            onChange={(e) => updateConfig('secret_access_key', e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            required
                            label="Region"
                            value={config.region || ''}
                            onChange={(e) => updateConfig('region', e.target.value)}
                            placeholder="us-east-1"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            required
                            label="Service"
                            value={config.service || ''}
                            onChange={(e) => updateConfig('service', e.target.value)}
                            placeholder="ec2"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            required
                            label="Resource ID"
                            value={config.resource_id || ''}
                            onChange={(e) => {
                                const resourceId = e.target.value;
                                updateConfig('resource_id', resourceId);
                                setFormData(prev => ({ ...prev, monitor_instance: resourceId }));
                            }}
                            placeholder="i-1234567890abcdef0"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Metric Name"
                            value={config.metric_name || ''}
                            onChange={(e) => updateConfig('metric_name', e.target.value)}
                            placeholder="CPUUtilization"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Alert severity="info">
                            Ensure the IAM user has permission to read CloudWatch metrics.
                        </Alert>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}
