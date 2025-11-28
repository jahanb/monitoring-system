// app/alerts/page.tsx - Fixed with MainLayout

'use client';
import { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Button,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    InputAdornment,
    Stack,
    Alert as MuiAlert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Tab,
    Tabs,
    Badge,
    Tooltip,
    CircularProgress
} from '@mui/material';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    PlayArrow as PlayArrowIcon,
    CheckCircleOutline as AcknowledgeIcon,
    Info as InfoIcon,
    Schedule as ScheduleIcon,
    Email as EmailIcon,
    Sms as SmsIcon,
    Phone as PhoneIcon,
    Webhook as WebhookIcon
} from '@mui/icons-material';
import { Alert, RecoveryAttempt, NotificationLog } from '@/lib/models/Alert';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';  // ← ADD THIS IMPORT

export default function AlertsPage() {
    const router = useRouter();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [acknowledgeDialog, setAcknowledgeDialog] = useState(false);
    const [acknowledgeNote, setAcknowledgeNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAlerts = async () => {
        try {
            const response = await fetch('/api/alerts');
            if (!response.ok) throw new Error('Failed to fetch alerts');
            const data = await response.json();
            setAlerts(data.alerts || []);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAcknowledge = async () => {
        if (!selectedAlert) return;

        setActionLoading(true);
        try {
            const response = await fetch(`/api/alerts/${selectedAlert._id}/acknowledge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: acknowledgeNote })
            });

            if (!response.ok) throw new Error('Failed to acknowledge alert');

            await fetchAlerts();
            setAcknowledgeDialog(false);
            setAcknowledgeNote('');
            setDetailsOpen(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleTriggerRecovery = async (alertId: string) => {
        setActionLoading(true);
        try {
            const response = await fetch(`/api/alerts/${alertId}/recover`, {
                method: 'POST'
            });

            if (!response.ok) throw new Error('Failed to trigger recovery');

            await fetchAlerts();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'alarm': return 'error';
            case 'warning': return 'warning';
            default: return 'default';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'error';
            case 'in_recovery': return 'warning';
            case 'acknowledged': return 'info';
            case 'recovered': return 'success';
            default: return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <ErrorIcon />;
            case 'in_recovery': return <PlayArrowIcon />;
            case 'acknowledged': return <AcknowledgeIcon />;
            case 'recovered': return <CheckCircleIcon />;
            default: return <InfoIcon />;
        }
    };

    const filteredAlerts = alerts
        .filter(alert => {
            if (filterStatus !== 'all' && alert.status !== filterStatus) return false;
            if (searchQuery && !alert.monitor_name.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            return true;
        })
        .sort((a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime());

    const alertCounts = {
        all: alerts.length,
        active: alerts.filter(a => a.status === 'active').length,
        in_recovery: alerts.filter(a => a.status === 'in_recovery').length,
        acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
        recovered: alerts.filter(a => a.status === 'recovered').length
    };

    return (
        <MainLayout>  {/* ← ADD THIS WRAPPER */}
            <Box>  {/* ← REMOVE sx={{ p: 3 }} - MainLayout handles padding */}
                {/* Header */}
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h4" fontWeight="bold">
                        🚨 Alerts & Incidents
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchAlerts}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                </Box>

                {error && (
                    <MuiAlert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                        {error}
                    </MuiAlert>
                )}

                {/* Summary Cards */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ bgcolor: '#f5f5f5' }}>
                            <CardContent>
                                <Typography variant="h4" fontWeight="bold">{alertCounts.all}</Typography>
                                <Typography color="text.secondary">Total Alerts</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ bgcolor: '#ffebee' }}>
                            <CardContent>
                                <Typography variant="h4" fontWeight="bold" color="error">{alertCounts.active}</Typography>
                                <Typography color="text.secondary">Active</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ bgcolor: '#fff3e0' }}>
                            <CardContent>
                                <Typography variant="h4" fontWeight="bold" color="warning.main">{alertCounts.in_recovery}</Typography>
                                <Typography color="text.secondary">In Recovery</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ bgcolor: '#e3f2fd' }}>
                            <CardContent>
                                <Typography variant="h4" fontWeight="bold" color="info.main">{alertCounts.acknowledged}</Typography>
                                <Typography color="text.secondary">Acknowledged</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ bgcolor: '#e8f5e9' }}>
                            <CardContent>
                                <Typography variant="h4" fontWeight="bold" color="success.main">{alertCounts.recovered}</Typography>
                                <Typography color="text.secondary">Recovered</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Filters */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                            <TextField
                                fullWidth
                                placeholder="Search by monitor name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Tabs
                                value={filterStatus}
                                onChange={(e, val) => setFilterStatus(val)}
                                sx={{ minWidth: 'fit-content' }}
                            >
                                <Tab label={`All (${alertCounts.all})`} value="all" />
                                <Tab label={`Active (${alertCounts.active})`} value="active" />
                                <Tab label={`Recovery (${alertCounts.in_recovery})`} value="in_recovery" />
                                <Tab label={`Ack'd (${alertCounts.acknowledged})`} value="acknowledged" />
                                <Tab label={`Recovered (${alertCounts.recovered})`} value="recovered" />
                            </Tabs>
                        </Stack>
                    </CardContent>
                </Card>

                {/* Alerts Table */}
                <Card>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Monitor</TableCell>
                                    <TableCell>Severity</TableCell>
                                    <TableCell>Message</TableCell>
                                    <TableCell>Value</TableCell>
                                    <TableCell>Failures</TableCell>
                                    <TableCell>Triggered At</TableCell>
                                    <TableCell>Duration</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center">
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredAlerts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center">
                                            <Typography color="text.secondary">No alerts found</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAlerts.map((alert) => (
                                        <TableRow key={alert._id} hover>
                                            <TableCell>
                                                <Chip
                                                    icon={getStatusIcon(alert.status)}
                                                    label={alert.status.replace('_', ' ').toUpperCase()}
                                                    color={getStatusColor(alert.status) as any}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {alert.monitor_name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={alert.severity.toUpperCase()}
                                                    color={getSeverityColor(alert.severity) as any}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                                                    {alert.message}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {alert.current_value?.toFixed(2) || 'N/A'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Badge badgeContent={alert.consecutive_failures} color="error">
                                                    <ErrorIcon fontSize="small" />
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {new Date(alert.triggered_at).toLocaleString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {formatDuration(alert.triggered_at, alert.recovered_at)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={1}>
                                                    {/* View Details/History Button */}
                                                    <Tooltip title="View Full History">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => {
                                                                setSelectedAlert(alert);
                                                                setDetailsOpen(true);
                                                            }}
                                                        >
                                                            <InfoIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>

                                                    {alert.status === 'active' && (
                                                        <>
                                                            <Tooltip title="Acknowledge Alert">
                                                                <IconButton
                                                                    size="small"
                                                                    color="info"
                                                                    onClick={() => {
                                                                        setSelectedAlert(alert);
                                                                        setAcknowledgeDialog(true);
                                                                    }}
                                                                >
                                                                    <AcknowledgeIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>

                                                            <Tooltip title="Trigger Recovery">
                                                                <IconButton
                                                                    size="small"
                                                                    color="warning"
                                                                    onClick={() => handleTriggerRecovery(alert._id!)}
                                                                    disabled={actionLoading}
                                                                >
                                                                    <PlayArrowIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                </Stack>
                                            </TableCell>

                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>

                {/* Alert Details Dialog */}
                <Dialog
                    open={detailsOpen}
                    onClose={() => setDetailsOpen(false)}
                    maxWidth="md"
                    fullWidth
                >
                    {selectedAlert && (
                        <>
                            <DialogTitle>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    {getStatusIcon(selectedAlert.status)}
                                    <Typography variant="h6">Alert Details: {selectedAlert.monitor_name}</Typography>
                                </Stack>
                            </DialogTitle>
                           // Enhanced Alert Details Dialog Content
                            // Replace the DialogContent section in your alerts/page.tsx

                            <DialogContent dividers>
                                <Grid container spacing={3}>
                                    {/* Basic Info Section */}
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                            ALERT INFORMATION
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="caption" color="text.secondary">Status</Typography>
                                                <Box sx={{ mt: 1 }}>
                                                    <Chip
                                                        icon={getStatusIcon(selectedAlert.status)}
                                                        label={selectedAlert.status.replace('_', ' ').toUpperCase()}
                                                        color={getStatusColor(selectedAlert.status) as any}
                                                    />
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    <Grid item xs={12} md={6}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="caption" color="text.secondary">Severity</Typography>
                                                <Box sx={{ mt: 1 }}>
                                                    <Chip
                                                        label={selectedAlert.severity.toUpperCase()}
                                                        color={getSeverityColor(selectedAlert.severity) as any}
                                                    />
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Card variant="outlined" sx={{ bgcolor: '#f5f5f5' }}>
                                            <CardContent>
                                                <Typography variant="caption" color="text.secondary">Message</Typography>
                                                <Typography variant="body1" sx={{ mt: 1, fontWeight: 'medium' }}>
                                                    {selectedAlert.message}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    {/* Metrics Section */}
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                                            METRICS & THRESHOLDS
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                    </Grid>

                                    <Grid item xs={6} md={3}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="caption" color="text.secondary">Current Value</Typography>
                                                <Typography variant="h6" sx={{ mt: 0.5 }}>
                                                    {selectedAlert.current_value?.toFixed(2) || 'N/A'}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    <Grid item xs={6} md={3}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="caption" color="text.secondary">Threshold</Typography>
                                                <Typography variant="h6" sx={{ mt: 0.5 }}>
                                                    {selectedAlert.threshold_value?.toFixed(2) || 'N/A'}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    <Grid item xs={6} md={3}>
                                        <Card variant="outlined" sx={{ bgcolor: '#ffebee' }}>
                                            <CardContent>
                                                <Typography variant="caption" color="text.secondary">Failures</Typography>
                                                <Typography variant="h6" color="error" sx={{ mt: 0.5 }}>
                                                    {selectedAlert.consecutive_failures}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    <Grid item xs={6} md={3}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="caption" color="text.secondary">Duration</Typography>
                                                <Typography variant="h6" sx={{ mt: 0.5 }}>
                                                    {formatDuration(selectedAlert.triggered_at, selectedAlert.recovered_at)}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>

                                    {/* Timeline Section */}
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                                            ALERT TIMELINE
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <List>
                                            {/* Triggered Event */}
                                            <ListItem sx={{ alignItems: 'flex-start', bgcolor: '#fff3e0', mb: 1, borderRadius: 1 }}>
                                                <ListItemIcon sx={{ mt: 1 }}>
                                                    <ErrorIcon color="error" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <Typography variant="body2" fontWeight="bold">
                                                            Alert Triggered
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <Box>
                                                            <Typography variant="caption" display="block" color="text.secondary">
                                                                {new Date(selectedAlert.triggered_at).toLocaleString()}
                                                            </Typography>
                                                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                                                Monitor detected {selectedAlert.consecutive_failures} consecutive failures
                                                            </Typography>
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>

                                            {/* Notifications Sent */}
                                            {selectedAlert.notifications_sent && selectedAlert.notifications_sent.length > 0 && (
                                                <ListItem sx={{ alignItems: 'flex-start', bgcolor: '#e3f2fd', mb: 1, borderRadius: 1 }}>
                                                    <ListItemIcon sx={{ mt: 1 }}>
                                                        <EmailIcon color="primary" />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={
                                                            <Typography variant="body2" fontWeight="bold">
                                                                Notifications Sent ({selectedAlert.notifications_sent.length})
                                                            </Typography>
                                                        }
                                                        secondary={
                                                            <Box>
                                                                <Typography variant="caption" display="block" color="text.secondary">
                                                                    {new Date(selectedAlert.notifications_sent[0].sent_at).toLocaleString()}
                                                                </Typography>
                                                                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                                                    Notified: {selectedAlert.notifications_sent.map(n => n.recipient).join(', ')}
                                                                </Typography>
                                                                <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                                    {selectedAlert.notifications_sent.map((n, i) => (
                                                                        <Chip
                                                                            key={i}
                                                                            label={n.status}
                                                                            size="small"
                                                                            color={n.status === 'sent' ? 'success' : 'error'}
                                                                            icon={n.channel === 'email' ? <EmailIcon fontSize="small" /> : undefined}
                                                                        />
                                                                    ))}
                                                                </Box>
                                                            </Box>
                                                        }
                                                    />
                                                </ListItem>
                                            )}

                                            {/* Acknowledged Event */}
                                            {selectedAlert.acknowledged_at && (
                                                <ListItem sx={{ alignItems: 'flex-start', bgcolor: '#e8f5e9', mb: 1, borderRadius: 1 }}>
                                                    <ListItemIcon sx={{ mt: 1 }}>
                                                        <AcknowledgeIcon color="success" />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={
                                                            <Typography variant="body2" fontWeight="bold">
                                                                Alert Acknowledged
                                                            </Typography>
                                                        }
                                                        secondary={
                                                            <Box>
                                                                <Typography variant="caption" display="block" color="text.secondary">
                                                                    {new Date(selectedAlert.acknowledged_at).toLocaleString()}
                                                                </Typography>
                                                                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                                                    By: {selectedAlert.acknowledged_by || 'Unknown'}
                                                                </Typography>
                                                                {selectedAlert.acknowledge_note && (
                                                                    <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                                                        Note: {selectedAlert.acknowledge_note}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        }
                                                    />
                                                </ListItem>
                                            )}

                                            {/* Recovery Attempts */}
                                            {selectedAlert.recovery_attempts && selectedAlert.recovery_attempts.length > 0 && (
                                                selectedAlert.recovery_attempts.map((attempt, index) => (
                                                    <ListItem
                                                        key={index}
                                                        sx={{
                                                            alignItems: 'flex-start',
                                                            bgcolor: attempt.status === 'success' ? '#e8f5e9' :
                                                                attempt.status === 'failed' ? '#ffebee' : '#fff3e0',
                                                            mb: 1,
                                                            borderRadius: 1
                                                        }}
                                                    >
                                                        <ListItemIcon sx={{ mt: 1 }}>
                                                            <PlayArrowIcon
                                                                color={attempt.status === 'success' ? 'success' :
                                                                    attempt.status === 'failed' ? 'error' : 'warning'}
                                                            />
                                                        </ListItemIcon>
                                                        <ListItemText
                                                            primary={
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Typography variant="body2" fontWeight="bold">
                                                                        Recovery Attempt #{attempt.attempt_number}
                                                                    </Typography>
                                                                    <Chip
                                                                        label={attempt.status.toUpperCase()}
                                                                        size="small"
                                                                        color={
                                                                            attempt.status === 'success' ? 'success' :
                                                                                attempt.status === 'failed' ? 'error' : 'warning'
                                                                        }
                                                                    />
                                                                </Box>
                                                            }
                                                            secondary={
                                                                <Box>
                                                                    <Typography variant="caption" display="block" color="text.secondary">
                                                                        Started: {new Date(attempt.started_at).toLocaleString()}
                                                                    </Typography>
                                                                    {attempt.completed_at && (
                                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                                            Completed: {new Date(attempt.completed_at).toLocaleString()}
                                                                        </Typography>
                                                                    )}
                                                                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                                                        Action: {attempt.action}
                                                                    </Typography>
                                                                    {attempt.error_message && (
                                                                        <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                                                                            <Typography variant="caption">
                                                                                {attempt.error_message}
                                                                            </Typography>
                                                                        </Alert>
                                                                    )}
                                                                </Box>
                                                            }
                                                        />
                                                    </ListItem>
                                                ))
                                            )}

                                            {/* Recovered Event */}
                                            {selectedAlert.recovered_at && (
                                                <ListItem sx={{ alignItems: 'flex-start', bgcolor: '#e8f5e9', mb: 1, borderRadius: 1 }}>
                                                    <ListItemIcon sx={{ mt: 1 }}>
                                                        <CheckCircleIcon color="success" />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={
                                                            <Typography variant="body2" fontWeight="bold" color="success.main">
                                                                Alert Recovered ✓
                                                            </Typography>
                                                        }
                                                        secondary={
                                                            <Box>
                                                                <Typography variant="caption" display="block" color="text.secondary">
                                                                    {new Date(selectedAlert.recovered_at).toLocaleString()}
                                                                </Typography>
                                                                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                                                    Total duration: {formatDuration(selectedAlert.triggered_at, selectedAlert.recovered_at)}
                                                                </Typography>
                                                                <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'success.main' }}>
                                                                    Monitor returned to normal operation
                                                                </Typography>
                                                            </Box>
                                                        }
                                                    />
                                                </ListItem>
                                            )}
                                        </List>
                                    </Grid>

                                    {/* Metadata Section */}
                                    {selectedAlert.metadata && Object.keys(selectedAlert.metadata).length > 0 && (
                                        <>
                                            <Grid item xs={12}>
                                                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                                                    ADDITIONAL DETAILS
                                                </Typography>
                                                <Divider sx={{ mb: 2 }} />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Card variant="outlined">
                                                    <CardContent>
                                                        <pre style={{
                                                            fontSize: '11px',
                                                            overflow: 'auto',
                                                            margin: 0,
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-word'
                                                        }}>
                                                            {JSON.stringify(selectedAlert.metadata, null, 2)}
                                                        </pre>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        </>
                                    )}

                                    {/* Recovery Summary - if recovered */}
                                    {selectedAlert.status === 'recovered' && (
                                        <>
                                            <Grid item xs={12}>
                                                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                                                    RECOVERY SUMMARY
                                                </Typography>
                                                <Divider sx={{ mb: 2 }} />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Card sx={{ bgcolor: '#e8f5e9', border: '2px solid #4caf50' }}>
                                                    <CardContent>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                                            <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
                                                            <Box>
                                                                <Typography variant="h6" color="success.main">
                                                                    Successfully Recovered
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    Alert resolved and monitor operational
                                                                </Typography>
                                                            </Box>
                                                        </Box>

                                                        <Grid container spacing={2}>
                                                            <Grid item xs={6} md={3}>
                                                                <Typography variant="caption" color="text.secondary">Downtime</Typography>
                                                                <Typography variant="body1" fontWeight="bold">
                                                                    {formatDuration(selectedAlert.triggered_at, selectedAlert.recovered_at)}
                                                                </Typography>
                                                            </Grid>
                                                            <Grid item xs={6} md={3}>
                                                                <Typography variant="caption" color="text.secondary">Recovery Attempts</Typography>
                                                                <Typography variant="body1" fontWeight="bold">
                                                                    {selectedAlert.recovery_attempts?.length || 0}
                                                                </Typography>
                                                            </Grid>
                                                            <Grid item xs={6} md={3}>
                                                                <Typography variant="caption" color="text.secondary">Notifications</Typography>
                                                                <Typography variant="body1" fontWeight="bold">
                                                                    {selectedAlert.notifications_sent?.length || 0}
                                                                </Typography>
                                                            </Grid>
                                                            <Grid item xs={6} md={3}>
                                                                <Typography variant="caption" color="text.secondary">Max Failures</Typography>
                                                                <Typography variant="body1" fontWeight="bold">
                                                                    {selectedAlert.consecutive_failures}
                                                                </Typography>
                                                            </Grid>
                                                        </Grid>

                                                        {selectedAlert.recovery_attempts && selectedAlert.recovery_attempts.length > 0 && (
                                                            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #4caf50' }}>
                                                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                                                    Recovery Method:
                                                                </Typography>
                                                                <Typography variant="body2">
                                                                    {selectedAlert.recovery_attempts
                                                                        .filter(a => a.status === 'success')
                                                                        .map(a => a.action)
                                                                        .join(', ') || 'Automatic recovery'}
                                                                </Typography>
                                                            </Box>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        </>
                                    )}

                                    {/* Active Alert Actions */}
                                    {selectedAlert.status === 'active' && (
                                        <>
                                            <Grid item xs={12}>
                                                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                                                    RECOMMENDED ACTIONS
                                                </Typography>
                                                <Divider sx={{ mb: 2 }} />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Card sx={{ bgcolor: '#fff3e0', border: '2px solid #ff9800' }}>
                                                    <CardContent>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                                            <WarningIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                                                            <Box>
                                                                <Typography variant="h6" color="warning.main">
                                                                    Active Alert - Action Required
                                                                </Typography>
                                                                <Typography variant="body2" color="text.secondary">
                                                                    This alert is still active and requires attention
                                                                </Typography>
                                                            </Box>
                                                        </Box>

                                                        <List dense>
                                                            <ListItem>
                                                                <ListItemText
                                                                    primary="1. Investigate the root cause"
                                                                    secondary="Check monitor logs and system status"
                                                                />
                                                            </ListItem>
                                                            <ListItem>
                                                                <ListItemText
                                                                    primary="2. Acknowledge the alert"
                                                                    secondary="Let the team know you're working on it"
                                                                />
                                                            </ListItem>
                                                            <ListItem>
                                                                <ListItemText
                                                                    primary="3. Trigger recovery action"
                                                                    secondary="Attempt automated remediation if available"
                                                                />
                                                            </ListItem>
                                                            <ListItem>
                                                                <ListItemText
                                                                    primary="4. Monitor for resolution"
                                                                    secondary="Verify that the issue is resolved"
                                                                />
                                                            </ListItem>
                                                        </List>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        </>
                                    )}
                                </Grid>
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setDetailsOpen(false)}>
                                    Close
                                </Button>
                                {selectedAlert.status === 'active' && (
                                    <>
                                        <Button
                                            onClick={() => {
                                                setDetailsOpen(false);
                                                setAcknowledgeDialog(true);
                                            }}
                                            color="primary"
                                            variant="outlined"
                                            startIcon={<AcknowledgeIcon />}
                                        >
                                            Acknowledge
                                        </Button>
                                        <Button
                                            onClick={() => handleTriggerRecovery(selectedAlert._id!)}
                                            color="warning"
                                            variant="contained"
                                            startIcon={<PlayArrowIcon />}
                                            disabled={actionLoading}
                                        >
                                            Trigger Recovery
                                        </Button>
                                    </>
                                )}
                            </DialogActions>
                        </>
                    )}
                </Dialog>

                {/* Acknowledge Dialog */}
                <Dialog open={acknowledgeDialog} onClose={() => setAcknowledgeDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Acknowledge Alert</DialogTitle>
                    <DialogContent>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Note (optional)"
                            value={acknowledgeNote}
                            onChange={(e) => setAcknowledgeNote(e.target.value)}
                            placeholder="Add a note about this acknowledgment..."
                            sx={{ mt: 2 }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setAcknowledgeDialog(false)}>Cancel</Button>
                        <Button
                            onClick={handleAcknowledge}
                            color="primary"
                            variant="contained"
                            disabled={actionLoading}
                        >
                            {actionLoading ? 'Processing...' : 'Acknowledge'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </MainLayout>
    );
}

function formatDuration(start: Date, end?: Date): string {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = endTime - startTime;

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}