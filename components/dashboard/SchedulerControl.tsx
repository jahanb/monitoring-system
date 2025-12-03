// components/dashboard/SchedulerControl.tsx

'use client';
import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Button,
    Box,
    Chip,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    PlayArrow as PlayIcon,
    Stop as StopIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';

export default function SchedulerControl() {
    const [status, setStatus] = useState<'running' | 'stopped' | 'loading'>('loading');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    // Check scheduler status
    const checkStatus = async () => {
        try {
            setStatus('loading');
            const response = await fetch('/systemup/api/scheduler/status');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('Scheduler status:', data); // Debug log

            setStatus(data.running ? 'running' : 'stopped');
            setLastChecked(new Date());
            setError(null);
        } catch (err: any) {
            console.error('Status check error:', err);
            setError('Failed to check scheduler status');
            setStatus('stopped'); // Fallback to stopped on error
        }
    };

    // Start scheduler
    const handleStart = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/systemup/api/scheduler/start', { method: 'POST' });
            const data = await response.json();

            if (response.ok) {
                setStatus('running');
            } else {
                setError(data.error || 'Failed to start scheduler');
            }
        } catch (err: any) {
            setError('Failed to start scheduler');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Stop scheduler
    const handleStop = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/systemup/api/scheduler/stop', { method: 'POST' });
            const data = await response.json();

            if (response.ok) {
                setStatus('stopped');
            } else {
                setError(data.error || 'Failed to stop scheduler');
            }
        } catch (err: any) {
            setError('Failed to stop scheduler');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Check status on mount and every 30 seconds
    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Scheduler Control</Typography>
                    {status === 'loading' ? (
                        <CircularProgress size={24} />
                    ) : (
                        <Chip
                            label={status === 'running' ? 'Running' : 'Stopped'}
                            color={status === 'running' ? 'success' : 'default'}
                            size="small"
                        />
                    )}
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    {status === 'stopped' ? (
                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<PlayIcon />}
                            onClick={handleStart}
                            disabled={loading}
                            fullWidth
                        >
                            {loading ? 'Starting...' : 'Start Scheduler'}
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<StopIcon />}
                            onClick={handleStop}
                            disabled={loading}
                            fullWidth
                        >
                            {loading ? 'Stopping...' : 'Stop Scheduler'}
                        </Button>
                    )}

                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={checkStatus}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                </Box>

                {lastChecked && (
                    <Typography variant="caption" color="text.secondary">
                        Last checked: {lastChecked.toLocaleTimeString()}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}