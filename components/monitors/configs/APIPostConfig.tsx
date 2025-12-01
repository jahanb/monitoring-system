// components/monitors/configs/APIPostConfig.tsx

import { useState } from 'react';
import {
    Card, CardContent, Typography, Divider, Grid, TextField,
    Box, Chip, IconButton, InputAdornment
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Monitor } from '@/lib/models/Monitor';

interface Props {
    formData: Partial<Monitor>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Monitor>>>;
}

export default function APIPostConfig({ formData, setFormData }: Props) {
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

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>API POST Settings</Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            rows={6}
                            label="POST Body (JSON)"
                            value={(formData as any).post_body || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, post_body: e.target.value }))}
                            helperText="JSON body to send with POST request"
                            placeholder='{"username": "test", "password": "test123"}'
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Expected Status Codes"
                            value={statusCodeInput}
                            onChange={(e) => setStatusCodeInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStatusCode())}
                            type="number"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleAddStatusCode}><AddIcon /></IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {formData.status_code?.map((code, index) => (
                                <Chip
                                    key={index}
                                    label={code}
                                    onDelete={() => setFormData(p => ({
                                        ...p,
                                        status_code: p.status_code?.filter((_, i) => i !== index)
                                    }))}
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
                            onChange={(e) => setFormData(p => ({ ...p, positive_pattern: e.target.value }))}
                            helperText="Regex that SHOULD appear"
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Negative Pattern"
                            value={formData.negative_pattern}
                            onChange={(e) => setFormData(p => ({ ...p, negative_pattern: e.target.value }))}
                            helperText="Regex that SHOULD NOT appear"
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}