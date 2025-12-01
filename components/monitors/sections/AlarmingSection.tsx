// components/monitors/sections/AlarmingSection.tsx

import { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Divider,
    Grid,
    TextField,
    Button,
    Box,
    Chip,
    IconButton,
    InputAdornment
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Monitor } from '@/lib/models/Monitor';

interface Props {
    formData: Partial<Monitor>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Monitor>>>;
}

export default function AlarmingSection({ formData, setFormData }: Props) {
    const [alarmingEmailInput, setAlarmingEmailInput] = useState('');
    const [alarmingNameInput, setAlarmingNameInput] = useState('');
    const [alarmingMobileInput, setAlarmingMobileInput] = useState('');
    const [alarmingRoleInput, setAlarmingRoleInput] = useState('');
    const [dependencyInput, setDependencyInput] = useState('');

    const handleAddAlarmingCandidate = () => {
        if (!alarmingEmailInput.trim()) return;

        const contact = {
            name: alarmingNameInput.trim() || alarmingEmailInput.trim().split('@')[0],
            email: alarmingEmailInput.trim(),
            mobile: alarmingMobileInput.trim() || undefined,
            role: alarmingRoleInput.trim() || undefined
        };

        setFormData(prev => ({
            ...prev,
            alarming_candidate: [...(prev.alarming_candidate || []), contact] as any
        }));

        setAlarmingNameInput('');
        setAlarmingEmailInput('');
        setAlarmingMobileInput('');
        setAlarmingRoleInput('');
    };

    const handleAddDependency = () => {
        if (dependencyInput.trim()) {
            setFormData(prev => ({
                ...prev,
                dependencies: [...(prev.dependencies || []), dependencyInput.trim()]
            }));
            setDependencyInput('');
        }
    };

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Alarming & Dependencies
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                            Alarming Contacts
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                            Add contacts who should receive alert notifications via email
                        </Typography>

                        <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Name"
                                        value={alarmingNameInput}
                                        onChange={(e) => setAlarmingNameInput(e.target.value)}
                                        placeholder="John Doe"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Email"
                                        type="email"
                                        value={alarmingEmailInput}
                                        onChange={(e) => setAlarmingEmailInput(e.target.value)}
                                        onKeyPress={(e) =>
                                            e.key === 'Enter' && (e.preventDefault(), handleAddAlarmingCandidate())
                                        }
                                        placeholder="john@example.com"
                                        helperText="Required to add a contact"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Mobile (Optional)"
                                        value={alarmingMobileInput}
                                        onChange={(e) => setAlarmingMobileInput(e.target.value)}
                                        placeholder="+1234567890"
                                        helperText="For future SMS notifications"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Role (Optional)"
                                        value={alarmingRoleInput}
                                        onChange={(e) => setAlarmingRoleInput(e.target.value)}
                                        placeholder="Primary, On-Call, etc."
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={handleAddAlarmingCandidate}
                                        disabled={!alarmingEmailInput.trim()}
                                        fullWidth
                                    >
                                        Add Contact
                                    </Button>
                                </Grid>
                            </Grid>
                        </Card>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {formData.alarming_candidate?.map((contact: any, i) => {
                                const isString = typeof contact === 'string';
                                const displayName = isString ? contact : contact.name || contact.email;
                                const displayEmail = isString ? contact : contact.email;
                                const displayMobile = isString ? null : contact.mobile;
                                const displayRole = isString ? null : contact.role;

                                return (
                                    <Card key={i} variant="outlined" sx={{ p: 1.5 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {displayName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    📧 {displayEmail}
                                                </Typography>
                                                {displayMobile && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                                                        📱 {displayMobile}
                                                    </Typography>
                                                )}
                                                {displayRole && <Chip label={displayRole} size="small" sx={{ ml: 1 }} />}
                                            </Box>
                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    setFormData(p => ({
                                                        ...p,
                                                        alarming_candidate: (p.alarming_candidate?.filter((_, idx) => idx !== i) as any)
                                                    }))
                                                }
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Card>
                                );
                            })}
                            {(!formData.alarming_candidate || formData.alarming_candidate.length === 0) && (
                                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                    No contacts added yet
                                </Typography>
                            )}
                        </Box>
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Dependencies"
                            value={dependencyInput}
                            onChange={(e) => setDependencyInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDependency())}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleAddDependency}>
                                            <AddIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {formData.dependencies?.map((d, i) => (
                                <Chip
                                    key={i}
                                    label={d}
                                    onDelete={() =>
                                        setFormData(p => ({
                                            ...p,
                                            dependencies: (p.dependencies?.filter((_, idx) => idx !== i) as any)
                                        }))
                                    }
                                    color="secondary"
                                    variant="outlined"
                                />
                            ))}
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}