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
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import MainLayout from '@/components/layout/MainLayout';
import { useRouter } from 'next/navigation';
import { Monitor } from '@/lib/models/Monitor';

export default function MonitorsPage() {
  const router = useRouter();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonitors = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/monitors');
      const data = await response.json();
      
      if (response.ok) {
        setMonitors(data.data);
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
      const response = await fetch(`/api/monitors/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchMonitors();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete monitor');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete monitor');
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

        {loading && (
          <Box display="flex" justifyContent="center" py={10}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
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

        {!loading && !error && monitors.length > 0 && (
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
                      </Box>

                      <Typography variant="body2" color="textSecondary" paragraph>
                        {monitor.description}
                      </Typography>

                      <Box display="flex" gap={3} flexWrap="wrap">
                        <Typography variant="body2">
                          <strong>Instance:</strong> {monitor.monitor_instance}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Owner:</strong> {monitor.business_owner}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Check Interval:</strong> {monitor.period_in_minute} min
                        </Typography>
                        <Typography variant="body2">
                          <strong>Created:</strong> {new Date(monitor.creation_date_time).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>

                    <Box display="flex" gap={1}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => router.push(`/monitors/${monitor._id}/edit`)}
                        title="Edit"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(monitor._id)}
                        title="Delete"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </MainLayout>
  );
}