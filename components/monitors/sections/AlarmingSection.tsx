// components/monitors/sections/AlarmingSection.tsx - UPDATED VERSION

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
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    OutlinedInput,
    SelectChangeEvent,
    Checkbox,
    ListItemText
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Monitor } from '@/lib/models/Monitor';

interface Props {
    formData: Partial<Monitor>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Monitor>>>;
}

const NOTIFICATION_CHANNELS = [
    { value: 'email', label: '📧 Email' },
    { value: 'sms', label: '📱 SMS' },
    { value: 'call', label: '📞 Phone Call' },
    { value: 'slack', label: '💬 Slack' },
    { value: 'webhook', label: '🔗 Webhook' }
];

export default function AlarmingSection({ formData, setFormData }: Props) {
    const [alarmingEmailInput, setAlarmingEmailInput] = useState('');
    const [alarmingNameInput, setAlarmingNameInput] = useState('');
    const [alarmingMobileInput, setAlarmingMobileInput] = useState('');
    const [alarmingRoleInput, setAlarmingRoleInput] = useState('');
    const [warningChannels, setWarningChannels] = useState<string[]>(['email']);
    const [alarmChannels, setAlarmChannels] = useState<string[]>(['email', 'sms']);
    const [dependencyInput, setDependencyInput] = useState('');

    const handleAddAlarmingCandidate = () => {
        if (!alarmingEmailInput.trim()) return;

        const contact = {
            name: alarmingNameInput.trim() || alarmingEmailInput.trim().split('@')[0],
            email: alarmingEmailInput.trim(),
            mobile: alarmingMobileInput.trim() || undefined,
            role: alarmingRoleInput.trim() || undefined,
            notification_preferences: {
                warning: warningChannels,
                alarm: alarmChannels
            }
        };

        setFormData(prev => ({
            ...prev,
            alarming_candidate: [...(prev.alarming_candidate || []), contact] as any
        }));

        // Reset inputs
        setAlarmingNameInput('');
        setAlarmingEmailInput('');
        setAlarmingMobileInput('');
        setAlarmingRoleInput('');
        setWarningChannels(['email']);
        setAlarmChannels(['email', 'sms']);
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

    const handleWarningChannelsChange = (event: SelectChangeEvent<string[]>) => {
        const value = event.target.value;
        setWarningChannels(typeof value === 'string' ? value.split(',') : value);
    };

    const handleAlarmChannelsChange = (event: SelectChangeEvent<string[]>) => {
        const value = event.target.value;
        setAlarmChannels(typeof value === 'string' ? value.split(',') : value);
    };

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Alarming & Dependencies
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                    {/* Global Notification Settings */}
                    <Grid item xs={12}>
                        <Card variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f0f9ff' }}>
                            <Typography variant="subtitle2" gutterBottom color="primary">
                                🔔 Default Notification Channels
                            </Typography>
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Warning Channels</InputLabel>
                                        <Select
                                            multiple
                                            value={formData.notification_settings?.warning_channels || ['email']}
                                            onChange={(e) => setFormData(prev => {
                                                const current = prev.notification_settings || { warning_channels: ['email'], alarm_channels: ['email', 'sms'] };
                                                return {
                                                    ...prev,
                                                    notification_settings: {
                                                        ...current,
                                                        warning_channels: e.target.value as any
                                                    }
                                                };
                                            })}
                                            input={<OutlinedInput label="Warning Channels" />}
                                            renderValue={(selected) => (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {selected.map((value) => (
                                                        <Chip key={value} label={NOTIFICATION_CHANNELS.find(c => c.value === value)?.label} size="small" />
                                                    ))}
                                                </Box>
                                            )}
                                        >
                                            {NOTIFICATION_CHANNELS.map((channel) => (
                                                <MenuItem key={channel.value} value={channel.value}>
                                                    <Checkbox checked={(formData.notification_settings?.warning_channels || ['email']).indexOf(channel.value as any) > -1} />
                                                    <ListItemText primary={channel.label} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Alarm Channels</InputLabel>
                                        <Select
                                            multiple
                                            value={formData.notification_settings?.alarm_channels || ['email', 'sms']}
                                            onChange={(e) => setFormData(prev => {
                                                const current = prev.notification_settings || { warning_channels: ['email'], alarm_channels: ['email', 'sms'] };
                                                return {
                                                    ...prev,
                                                    notification_settings: {
                                                        ...current,
                                                        alarm_channels: e.target.value as any
                                                    }
                                                };
                                            })}
                                            input={<OutlinedInput label="Alarm Channels" />}
                                            renderValue={(selected) => (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {selected.map((value) => (
                                                        <Chip key={value} label={NOTIFICATION_CHANNELS.find(c => c.value === value)?.label} size="small" />
                                                    ))}
                                                </Box>
                                            )}
                                        >
                                            {NOTIFICATION_CHANNELS.map((channel) => (
                                                <MenuItem key={channel.value} value={channel.value}>
                                                    <Checkbox checked={(formData.notification_settings?.alarm_channels || ['email', 'sms']).indexOf(channel.value as any) > -1} />
                                                    <ListItemText primary={channel.label} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                ⚠️ Warnings use lighter channels (email), Alarms use urgent channels (email + SMS/call)
                            </Typography>
                        </Card>
                    </Grid>

                    {/* Add Contact Section */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                            Alarming Contacts
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                            Add contacts with their preferred notification channels
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
                                        helperText="Required for SMS/Call notifications"
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

                                {/* Per-Contact Notification Preferences */}
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Warning Notifications</InputLabel>
                                        <Select
                                            multiple
                                            value={warningChannels}
                                            onChange={handleWarningChannelsChange}
                                            input={<OutlinedInput label="Warning Notifications" />}
                                            renderValue={(selected) => (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {selected.map((value) => (
                                                        <Chip key={value} label={NOTIFICATION_CHANNELS.find(c => c.value === value)?.label} size="small" />
                                                    ))}
                                                </Box>
                                            )}
                                        >
                                            {NOTIFICATION_CHANNELS.map((channel) => (
                                                <MenuItem key={channel.value} value={channel.value}>
                                                    <Checkbox checked={warningChannels.indexOf(channel.value) > -1} />
                                                    <ListItemText primary={channel.label} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Alarm Notifications</InputLabel>
                                        <Select
                                            multiple
                                            value={alarmChannels}
                                            onChange={handleAlarmChannelsChange}
                                            input={<OutlinedInput label="Alarm Notifications" />}
                                            renderValue={(selected) => (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                    {selected.map((value) => (
                                                        <Chip key={value} label={NOTIFICATION_CHANNELS.find(c => c.value === value)?.label} size="small" />
                                                    ))}
                                                </Box>
                                            )}
                                        >
                                            {NOTIFICATION_CHANNELS.map((channel) => (
                                                <MenuItem key={channel.value} value={channel.value}>
                                                    <Checkbox checked={alarmChannels.indexOf(channel.value) > -1} />
                                                    <ListItemText primary={channel.label} />
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
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

                        {/* Display Added Contacts */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {formData.alarming_candidate?.map((contact: any, i) => {
                                const isString = typeof contact === 'string';
                                const displayName = isString ? contact : contact.name || contact.email;
                                const displayEmail = isString ? contact : contact.email;
                                const displayMobile = isString ? null : contact.mobile;
                                const displayRole = isString ? null : contact.role;
                                const warningPrefs = isString ? [] : (contact.notification_preferences?.warning || ['email']);
                                const alarmPrefs = isString ? [] : (contact.notification_preferences?.alarm || ['email']);

                                return (
                                    <Card key={i} variant="outlined" sx={{ p: 1.5 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box sx={{ flex: 1 }}>
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
                                                {displayRole && (
                                                    <Chip label={displayRole} size="small" sx={{ ml: 1 }} />
                                                )}

                                                {/* Show notification preferences */}
                                                {!isString && (
                                                    <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            🟡 Warning:
                                                        </Typography>
                                                        {warningPrefs.map((ch: string) => (
                                                            <Chip
                                                                key={ch}
                                                                label={NOTIFICATION_CHANNELS.find(c => c.value === ch)?.label}
                                                                size="small"
                                                                color="warning"
                                                                variant="outlined"
                                                            />
                                                        ))}
                                                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                            🔴 Alarm:
                                                        </Typography>
                                                        {alarmPrefs.map((ch: string) => (
                                                            <Chip
                                                                key={ch}
                                                                label={NOTIFICATION_CHANNELS.find(c => c.value === ch)?.label}
                                                                size="small"
                                                                color="error"
                                                                variant="outlined"
                                                            />
                                                        ))}
                                                    </Box>
                                                )}
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

                    {/* Dependencies */}
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