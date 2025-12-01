// components/monitors/configs/URLConfig.tsx

import { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Divider,
    Grid,
    TextField,
    Box,
    Chip,
    IconButton,
    InputAdornment
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Monitor } from '@/lib/models/Monitor';

interface Props {
    formData: Partial<Monitor>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Monitor>>>;
}

export default function URLConfig({ formData, setFormData }: Props) {
    const [statusCodeInput, setStatusCodeInput] = useState('');

    const handleAddStatusCode = () => {
        const code = parseInt(statusCodeInput);
        if (code && code >= 100 && code < 600) {
            setFormData(prev => ({
                ...prev,
                status_code: [...(prev.status_code || []), code]
            }));
            setStatusCodeInput('');
        }
    };

    const handleRemoveStatusCode = (index: number) => {
        setFormData(prev => ({
            ...prev,
            status_code: prev.status_code?.filter((_, i) => i !== index)
        }));
    };

    const handleChange = (field: keyof Monitor) => (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setFormData(prev => ({ ...prev, [field]: event.target.value }));
    };

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    URL Monitoring Settings
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Status Codes"
                            value={statusCodeInput}
                            onChange={(e) => setStatusCodeInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStatusCode())}
                            type="number"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleAddStatusCode}>
                                            <AddIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            helperText="Add expected HTTP status codes"
                        />
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {formData.status_code?.map((c, i) => (
                                <Chip
                                    key={i}
                                    label={c}
                                    onDelete={() => handleRemoveStatusCode(i)}
                                    color="success"
                                />
                            ))}
                        </Box>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Positive Pattern"
                            value={formData.positive_pattern}
                            onChange={handleChange('positive_pattern')}
                            helperText="Regex that SHOULD appear in response"
                            placeholder="success|ok|completed"
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Negative Pattern"
                            value={formData.negative_pattern}
                            onChange={handleChange('negative_pattern')}
                            helperText="Regex that SHOULD NOT appear"
                            placeholder="error|exception|failed"
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}