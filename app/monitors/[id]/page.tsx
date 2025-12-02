// app/monitors/[id]/page.tsx

'use client';
import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import MainLayout from '@/components/layout/MainLayout';

export default function MonitorDetailPage({ params }: { params: { id: string } }) {
  const [monitor, setMonitor] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24');

  const fetchData = async () => {
    try {
      const [monitorRes, metricsRes] = await Promise.all([
        fetch(`/systemup/api/monitors/${params.id}`),
        fetch(`/systemup/api/monitors/${params.id}/metrics?hours=${timeRange}`)
      ]);

      const monitorData = await monitorRes.json();
      const metricsData = await metricsRes.json();

      if (monitorRes.ok) setMonitor(monitorData.data);
      if (metricsRes.ok) setMetrics(metricsData.data);
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
  }, [params.id, timeRange]);

  if (loading) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error || !monitor) {
    return (
      <MainLayout>
        <Alert severity="error">{error || 'Monitor not found'}</Alert>
      </MainLayout>
    );
  }

  const latestMetric = metrics[metrics.length - 1];
  const currentStatus = monitor.currentState?.current_status || latestMetric?.status || 'unknown';

  const chartData = metrics.map(m => ({
    timestamp: new Date(m.timestamp).toLocaleTimeString(),
    responseTime: m.response_time || 0,
    status: m.status
  }));

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

  return (
    <MainLayout>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              {monitor.monitor_name}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {monitor.monitor_type.toUpperCase()} • {monitor.monitor_instance}
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="1">Last 1 hour</MenuItem>
              <MenuItem value="6">Last 6 hours</MenuItem>
              <MenuItem value="24">Last 24 hours</MenuItem>
              <MenuItem value="168">Last 7 days</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {/* Current Status */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Current Status
                </Typography>
                <Chip
                  label={currentStatus.toUpperCase()}
                  color={getStatusColor(currentStatus)}
                  sx={{ fontSize: '1.2rem', padding: '20px 10px' }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Response Time
                </Typography>
                <Typography variant="h5">
                  {latestMetric?.response_time || 'N/A'}
                  {latestMetric?.response_time && 'ms'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Certificate Expiry
                </Typography>
                <Typography variant="h5">
                  {latestMetric?.metadata?.certificateDaysRemaining || 'N/A'}
                  {latestMetric?.metadata?.certificateDaysRemaining && ' days'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Uptime
                </Typography>
                <Typography variant="h5">
                  {metrics.length > 0
                    ? ((metrics.filter(m => m.status === 'ok').length / metrics.length) * 100).toFixed(1) + '%'
                    : 'N/A'
                  }
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Response Time Chart */}
        {metrics.length > 0 ? (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Response Time History
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  {monitor.high_value_threshold_warning && (
                    <ReferenceLine
                      y={monitor.high_value_threshold_warning}
                      stroke="orange"
                      strokeDasharray="3 3"
                      label="Warning"
                    />
                  )}
                  {monitor.high_value_threshold_alarm && (
                    <ReferenceLine
                      y={monitor.high_value_threshold_alarm}
                      stroke="red"
                      strokeDasharray="3 3"
                      label="Alarm"
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={false}
                    name="Response Time"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Alert severity="info" sx={{ mb: 3 }}>
            No historical data available yet. Monitoring data will appear after the first check runs.
          </Alert>
        )}

        {/* Additional Info */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Monitor Configuration
                </Typography>
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Check Period</Typography>
                    <Typography>{monitor.period_in_minute} minutes</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Timeout</Typography>
                    <Typography>{monitor.timeout_in_second} seconds</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Owner</Typography>
                    <Typography>{monitor.business_owner}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Severity</Typography>
                    <Chip label={monitor.severity} size="small" />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Latest Check Details
                </Typography>
                {latestMetric ? (
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">Timestamp</Typography>
                      <Typography>{new Date(latestMetric.timestamp).toLocaleString()}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">Status Code</Typography>
                      <Typography>{latestMetric.status_code || 'N/A'}</Typography>
                    </Box>
                    {latestMetric.metadata?.certificateIssuer && (
                      <Box>
                        <Typography variant="body2" color="textSecondary">Certificate Issuer</Typography>
                        <Typography>{latestMetric.metadata.certificateIssuer}</Typography>
                      </Box>
                    )}
                    {latestMetric.metadata?.patternMatch && (
                      <Box>
                        <Typography variant="body2" color="textSecondary">Pattern Match</Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip
                            label={`Positive: ${latestMetric.metadata.patternMatch.positive ? '✓' : '✗'}`}
                            size="small"
                            color={latestMetric.metadata.patternMatch.positive ? 'success' : 'error'}
                          />
                          <Chip
                            label={`Negative: ${!latestMetric.metadata.patternMatch.negative ? '✓' : '✗'}`}
                            size="small"
                            color={!latestMetric.metadata.patternMatch.negative ? 'success' : 'error'}
                          />
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                ) : (
                  <Typography color="textSecondary">No check data available yet</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </MainLayout>
  );
}