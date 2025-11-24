// app/monitors/new/page.tsx

'use client';
import { Box, Typography, Paper } from '@mui/material';
import MainLayout from '@/components/layout/MainLayout';
import MonitorForm from '@/components/monitors/MonitorForm';

export default function NewMonitorPage() {
  return (
    <MainLayout>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Monitor
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Configure a new monitoring check for your systems, APIs, or resources.
        </Typography>

        <Paper elevation={0} sx={{ mt: 3 }}>
          <MonitorForm mode="create" />
        </Paper>
      </Box>
    </MainLayout>
  );
}