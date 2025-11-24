// app/monitors/[id]/edit/page.tsx

'use client';
import { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import MainLayout from '@/components/layout/MainLayout';
import MonitorForm from '@/components/monitors/MonitorForm';
import { Monitor } from '@/lib/models/Monitor';

interface PageProps {
  params: {
    id: string;
  };
}

export default function EditMonitorPage({ params }: PageProps) {
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonitor = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/monitors/${params.id}`);
        const data = await response.json();

        if (response.ok) {
          setMonitor(data.data);
        } else {
          setError(data.error || 'Failed to fetch monitor');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch monitor');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchMonitor();
    }
  }, [params.id]);

  return (
    <MainLayout>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Edit Monitor
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Update the configuration for this monitoring check.
        </Typography>

        {loading && (
          <Box display="flex" justifyContent="center" py={10}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && monitor && (
          <Paper elevation={0} sx={{ mt: 3 }}>
            <MonitorForm 
              mode="edit" 
              monitorId={params.id}
              initialData={monitor} 
            />
          </Paper>
        )}

        {!loading && !error && !monitor && (
          <Alert severity="warning" sx={{ mt: 3 }}>
            Monitor not found
          </Alert>
        )}
      </Box>
    </MainLayout>
  );
}