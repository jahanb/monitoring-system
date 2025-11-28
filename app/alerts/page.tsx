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
                                                    <Tooltip title="View Details">
                                                        <IconButton
                                                            size="small"
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
                                                            <Tooltip title="Acknowledge">
                                                                <IconButton
                                                                    size="small"
                                                                    color="primary"
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
                            <DialogContent dividers>
                                {/* ... all your existing dialog content ... */}
                            </DialogContent>
                            <DialogActions>
                                <Button onClick={() => setDetailsOpen(false)}>Close</Button>
                                {selectedAlert.status === 'active' && (
                                    <>
                                        <Button
                                            onClick={() => {
                                                setDetailsOpen(false);
                                                setAcknowledgeDialog(true);
                                            }}
                                            color="primary"
                                            startIcon={<AcknowledgeIcon />}
                                        >
                                            Acknowledge
                                        </Button>
                                        <Button
                                            onClick={() => handleTriggerRecovery(selectedAlert._id!)}
                                            color="warning"
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