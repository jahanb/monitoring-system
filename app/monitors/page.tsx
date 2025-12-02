// app/monitors/page.tsx

'use client';
import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ContentCopy as DuplicateIcon,
  PlayArrow as PlayIcon
} from '@mui/icons-material';
import MainLayout from '@/components/layout/MainLayout';
import { useRouter } from 'next/navigation';
import { Monitor } from '@/lib/models/Monitor';

export default function MonitorsPage() {
  const router = useRouter();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Duplicate dialog state
  const [duplicateDialog, setDuplicateDialog] = useState(false);
  const [monitorToDuplicate, setMonitorToDuplicate] = useState<Monitor | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicating, setDuplicating] = useState(false);

  const fetchMonitors = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/systemup/api/monitors');
      const data = await response.json();

      if (response.ok) {
        // Handle both possible response formats
        setMonitors(data.data || data.monitors || []);
      } else {
        setError(data.error || 'Failed to fetch monitors');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to API');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this monitor?')) {
      return;
    }

    try {
      const response = await fetch(`/systemup/api/monitors/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('Monitor deleted successfully');
        fetchMonitors();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete monitor');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete monitor');
    }
  };

  const handleDuplicateClick = (monitor: Monitor) => {
    setMonitorToDuplicate(monitor);
    setDuplicateName(`${monitor.monitor_name} (Copy)`);
    setDuplicateDialog(true);
  };

  const handleDuplicate = async () => {
    if (!monitorToDuplicate || !duplicateName.trim()) {
      setError('Please enter a name for the duplicated monitor');
      return;
    }

    setDuplicating(true);

    try {
      // Create a copy of the monitor without _id and with new name
      const duplicatedMonitor: any = {
        ...monitorToDuplicate,
        monitor_name: duplicateName.trim(),
        // Remove fields that should be reset
        _id: undefined,
        created_at: undefined,
        updated_at: undefined,
        creation_date_time: undefined,
        last_check_time: undefined,
        last_check_status: undefined,
        last_check_message: undefined,
        last_check_value: undefined
      };

      // Remove undefined fields
      Object.keys(duplicatedMonitor).forEach(key => {
        if (duplicatedMonitor[key] === undefined) {
          delete duplicatedMonitor[key];
        }
      });

      const response = await fetch('/systemup/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatedMonitor)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to duplicate monitor');
      }

      setSuccess(`Monitor duplicated successfully! Redirecting to edit...`);
      setDuplicateDialog(false);

      // Get the new monitor ID from response
      const newMonitorId = data.monitor?._id || data.data?._id || data.id;

      // Redirect to edit page after 1 second
      setTimeout(() => {
        if (newMonitorId) {
          router.push(`/monitors/${newMonitorId}/edit`);
        } else {
          // If no ID, just refresh and close
          fetchMonitors();
        }
      }, 1000);

    } catch (err: any) {
      setError(err.message);
      setDuplicating(false);
    }
  };

  const handleExecuteNow = async (id: string, name: string) => {
    try {
      setSuccess(`Executing ${name}...`);

      const response = await fetch('/systemup/api/monitors/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monitor_id: id })
      });

      if (!response.ok) throw new Error('Failed to execute monitor');

      const data = await response.json();

      if (data.result?.success) {
        setSuccess(`${name} executed successfully - Status: ${data.result.status}`);
      } else {
        setError(`${name} failed - ${data.result?.message || 'Unknown error'}`);
      }

      // Refresh monitors to show updated status
      setTimeout(() => {
        fetchMonitors();
      }, 2000);

      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);

    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchMonitors();
  }, []);

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, 'error' | 'warning' | 'info' | 'success'> = {
      critical: 'error',
      high: 'error',
      medium: 'warning',
      low: 'info'
    };
    return colors[severity] || 'default';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'info'> = {
      url: 'primary',
      api_post: 'primary',
      ssh: 'secondary',
      aws: 'warning',
      ping: 'info',
      cpu: 'secondary',
      memory: 'warning',
      system_availability: 'success',
      disk: 'info'
    };
    return colors[type] || 'default';
  };

  return (
    <MainLayout>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Monitors
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchMonitors}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/monitors/new')}
            >
              Create Monitor
            </Button>
          </Stack>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {loading && (
          <Box display="flex" justifyContent="center" py={10}>
            <CircularProgress />
          </Box>
        )}

        {!loading && !error && monitors.length === 0 && (
          <Card>
            <CardContent>
              <Box textAlign="center" py={5}>
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  No monitors configured yet
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Get started by creating your first monitor
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => router.push('/monitors/new')}
                >
                  Create First Monitor
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {!loading && monitors.length > 0 && (
          <Stack spacing={2}>
            {monitors.map((monitor: any) => (
              <Card key={monitor._id}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="h6">
                          {monitor.monitor_name}
                        </Typography>
                        <Chip
                          label={monitor.monitor_type}
                          color={getTypeColor(monitor.monitor_type)}
                          size="small"
                        />
                        <Chip
                          label={monitor.severity}
                          color={getSeverityColor(monitor.severity)}
                          size="small"
                        />
                        <Chip
                          label={monitor.active_disable ? 'Active' : 'Disabled'}
                          color={monitor.active_disable ? 'success' : 'default'}
                          size="small"
                        />
                        {!monitor.running_stopped && (
                          <Chip
                            label="Stopped"
                            color="error"
                            size="small"
                          />
                        )}
                        {monitor.last_check_status && (
                          <Chip
                            label={`Last: ${monitor.last_check_status}`}
                            color={
                              monitor.last_check_status === 'ok' ? 'success' :
                                monitor.last_check_status === 'warning' ? 'warning' :
                                  monitor.last_check_status === 'alarm' ? 'error' : 'default'
                            }
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>

                      <Typography variant="body2" color="textSecondary" paragraph>
                        {monitor.description || 'No description'}
                      </Typography>

                      <Box display="flex" gap={3} flexWrap="wrap">
                        <Typography variant="body2">
                          <strong>Instance:</strong> {monitor.monitor_instance || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Owner:</strong> {monitor.business_owner}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Check Interval:</strong> {monitor.period_in_minute} min
                        </Typography>
                        {monitor.creation_date_time && (
                          <Typography variant="body2">
                            <strong>Created:</strong> {new Date(monitor.creation_date_time).toLocaleDateString()}
                          </Typography>
                        )}
                        {monitor.last_check_time && (
                          <Typography variant="body2">
                            <strong>Last Check:</strong> {new Date(monitor.last_check_time).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Box display="flex" gap={1}>
                      <Tooltip title="Execute Now">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleExecuteNow(monitor._id, monitor.monitor_name)}
                        >
                          <PlayIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Duplicate">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleDuplicateClick(monitor)}
                        >
                          <DuplicateIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => router.push(`/monitors/${monitor._id}/edit`)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(monitor._id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {/* Duplicate Dialog */}
      <Dialog
        open={duplicateDialog}
        onClose={() => !duplicating && setDuplicateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Duplicate Monitor</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create a copy of <strong>{monitorToDuplicate?.monitor_name}</strong>
            </Typography>

            <TextField
              fullWidth
              label="New Monitor Name"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              autoFocus
              disabled={duplicating}
              helperText="Enter a unique name for the duplicated monitor"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !duplicating) {
                  handleDuplicate();
                }
              }}
            />

            {monitorToDuplicate && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Monitor Details:
                </Typography>
                <Typography variant="body2">
                  <strong>Type:</strong> {monitorToDuplicate.monitor_type}
                </Typography>
                <Typography variant="body2">
                  <strong>Instance:</strong> {monitorToDuplicate.monitor_instance || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Period:</strong> {monitorToDuplicate.period_in_minute} minutes
                </Typography>
              </Box>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              The duplicated monitor will have all the same settings but will be created as a new monitor.
              You'll be redirected to edit it after creation.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDuplicateDialog(false)}
            disabled={duplicating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDuplicate}
            variant="contained"
            disabled={duplicating || !duplicateName.trim()}
            startIcon={duplicating ? <CircularProgress size={16} /> : <DuplicateIcon />}
          >
            {duplicating ? 'Duplicating...' : 'Duplicate & Edit'}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}