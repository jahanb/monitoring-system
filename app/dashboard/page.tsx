// app/dashboard/page.tsx - DataTable version

'use client';
import { useEffect, useState } from 'react';
import SchedulerControl from '@/components/dashboard/SchedulerControl';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Stack,
  IconButton,
  Chip,
  Container
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams
} from '@mui/x-data-grid';
import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Visibility
} from '@mui/icons-material';
import MainLayout from '@/components/layout/MainLayout';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch('/systemup/api/dashboard');
      const result = await response.json();
      if (response.ok) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    const colors: any = {
      ok: 'success',
      warning: 'warning',
      alarm: 'error',
      error: 'error',
      unknown: 'default'
    };
    return colors[status] || 'default';
  };

  const columns: GridColDef[] = [
    {
      field: 'monitor_name',
      headerName: 'Monitor Name',
      flex: 1,
      minWidth: 200
    },
    {
      field: 'monitor_type',
      headerName: 'Type',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={params.value.toUpperCase()} size="small" />
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        const status = params.row.state?.current_status || params.row.latestMetric?.status || 'unknown';
        return (
          <Chip
            label={status.toUpperCase()}
            color={getStatusColor(status)}
            size="small"
          />
        );
      }
    },
    {
      field: 'responseTime',
      headerName: 'Response Time',
      width: 130,
      renderCell: (params: GridRenderCellParams) => {
        const rt = params.row.latestMetric?.response_time;
        return rt ? `${rt}ms` : 'N/A';
      }
    },
    {
      field: 'certificate',
      headerName: 'Cert Expiry',
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        const days = params.row.latestMetric?.metadata?.certificateDaysRemaining;
        if (!days) return 'N/A';
        return (
          <Chip
            label={`${days} days`}
            size="small"
            color={days > 30 ? 'success' : days > 7 ? 'warning' : 'error'}
          />
        );
      }
    },
    {
      field: 'lastCheck',
      headerName: 'Last Check',
      width: 180,
      renderCell: (params: GridRenderCellParams) => {
        const lastCheck = params.row.state?.last_check_time;
        return lastCheck ? new Date(lastCheck).toLocaleString() : 'Never';
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <IconButton
          size="small"
          color="primary"
          onClick={() => router.push(`/monitors/${params.row._id}`)}
        >
          <Visibility />
        </IconButton>
      )
    }
  ];

  if (loading) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Alert severity="error">{error}</Alert>
      </MainLayout>
    );
  }

  return (
    <><Container maxWidth="xl">
      <Box sx={{
        mt: 8,
        mb: 4,
        display: 'flex',
        justifyContent: 'center'
      }}>
        <Box sx={{ width: '100%', maxWidth: 500 }}>
          <SchedulerControl />
        </Box>
      </Box>
    </Container>
      <MainLayout>
        <Box>
          <Typography variant="h4" gutterBottom>
            Monitoring Dashboard
          </Typography>

          {/* Status Overview */}
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <CheckCircle color="success" fontSize="large" />
                    <Box>
                      <Typography variant="h4">{data.statusCounts.ok}</Typography>
                      <Typography color="textSecondary">Healthy</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Warning color="warning" fontSize="large" />
                    <Box>
                      <Typography variant="h4">{data.statusCounts.warning}</Typography>
                      <Typography color="textSecondary">Warning</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <ErrorIcon color="error" fontSize="large" />
                    <Box>
                      <Typography variant="h4">{data.statusCounts.alarm}</Typography>
                      <Typography color="textSecondary">Critical</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <ErrorIcon fontSize="large" />
                    <Box>
                      <Typography variant="h4">{data.statusCounts.error}</Typography>
                      <Typography color="textSecondary">Error</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Monitor Table */}
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                All Monitors
              </Typography>
              <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                  rows={data.monitors}
                  columns={columns}
                  getRowId={(row) => row._id}
                  initialState={{
                    pagination: {
                      paginationModel: { pageSize: 10 }
                    }
                  }}
                  pageSizeOptions={[10, 25, 50, 100]}
                  disableRowSelectionOnClick />
              </Box>
            </CardContent>
          </Card>

          {/* Active Alerts */}
          {data.activeAlerts.length > 0 && (
            <Box mt={4}>
              <Typography variant="h5" gutterBottom>
                Active Alerts
              </Typography>
              <Stack spacing={2}>
                {data.activeAlerts.map((alert: any) => (
                  <Alert
                    key={alert._id}
                    severity={alert.severity === 'alarm' ? 'error' : 'warning'}
                  >
                    <Typography variant="subtitle2">{alert.monitor_name}</Typography>
                    <Typography variant="body2">{alert.message}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Triggered: {new Date(alert.triggered_at).toLocaleString()}
                    </Typography>
                  </Alert>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </MainLayout></>
  );
}