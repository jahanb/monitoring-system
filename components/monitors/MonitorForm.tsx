// components/monitors/MonitorForm.tsx - MAIN COMPONENT

'use client';
import { useState, useEffect } from 'react';
import { Box, Alert, Stack, Button } from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { Monitor } from '@/lib/models/Monitor';
import { useRouter } from 'next/navigation';

// Import sections
import BasicInfoSection from './sections/BasicInfoSection';
import AlarmingSection from './sections/AlarmingSection';
import ThresholdsSection from './sections/ThresholdsSection';
import TimingSection from './sections/TimingSection';
import StatusSection from './sections/StatusSection';

// Import monitor type configs
import URLConfig from './configs/URLConfig';
import SSHConfig from './configs/SSHConfig';
import AWSConfig from './configs/AWSConfig';
import DockerConfig from './configs/DockerConfig';
import CertificateConfig from './configs/CertificateConfig';
import LogConfig from './configs/LogConfig';
import PingConfig from './configs/PingConfig';
import APIPostConfig from './configs/APIPostConfig';

interface MonitorFormProps {
  initialData?: Partial<Monitor>;
  mode: 'create' | 'edit';
  monitorId?: string;
}

export default function MonitorForm({ initialData, mode, monitorId }: MonitorFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Main form state
  const [formData, setFormData] = useState<Partial<Monitor>>({
    monitor_name: initialData?.monitor_name || '',
    monitor_type: initialData?.monitor_type || 'url',
    created_by: initialData?.created_by || '',
    business_owner: initialData?.business_owner || '',
    alarming_candidate: initialData?.alarming_candidate || [],
    dependencies: initialData?.dependencies || [],
    description: initialData?.description || '',
    severity: initialData?.severity || 'medium',
    monitor_instance: initialData?.monitor_instance || '',
    positive_pattern: initialData?.positive_pattern || '',
    negative_pattern: initialData?.negative_pattern || '',
    low_value_threshold_warning: initialData?.low_value_threshold_warning,
    high_value_threshold_warning: initialData?.high_value_threshold_warning,
    low_value_threshold_alarm: initialData?.low_value_threshold_alarm,
    high_value_threshold_alarm: initialData?.high_value_threshold_alarm,
    consecutive_warning: initialData?.consecutive_warning || 2,
    consecutive_alarm: initialData?.consecutive_alarm || 3,
    status_code: initialData?.status_code || [200, 201, 204, 301, 302, 303, 304],
    period_in_minute: initialData?.period_in_minute || 5,
    timeout_in_second: initialData?.timeout_in_second || 30,
    recovery_action: initialData?.recovery_action || '',
    alarm_after_n_failure: initialData?.alarm_after_n_failure || 3,
    reset_after_m_ok: initialData?.reset_after_m_ok || 2,
    active_disable: initialData?.active_disable ?? true,
    running_stopped: initialData?.running_stopped ?? true,
  });

  // Initialize nested configs from initialData
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...(initialData as any).ssh_config && { ssh_config: (initialData as any).ssh_config },
        ...(initialData as any).aws_config && { aws_config: (initialData as any).aws_config },
        ...(initialData as any).docker_config && { docker_config: (initialData as any).docker_config },
        ...(initialData as any).post_body && { post_body: (initialData as any).post_body },
        ...(initialData as any).log_config && { log_config: (initialData as any).log_config },
        ...(initialData as any).certificate_config && { certificate_config: (initialData as any).certificate_config },
        ...(initialData as any).alert_settings && { alert_settings: (initialData as any).alert_settings },
        ...(initialData as any).ping_config && { ping_config: (initialData as any).ping_config },
      }));
    }
  }, [initialData]);

  // Validation function
  const validateForm = (): boolean => {
    // Basic required fields
    if (!formData.monitor_name?.trim()) {
      setError('Monitor name is required');
      return false;
    }
    if (!formData.created_by?.trim()) {
      setError('Created by is required');
      return false;
    }
    if (!formData.business_owner?.trim()) {
      setError('Business owner is required');
      return false;
    }

    // Type-specific validation
    switch (formData.monitor_type) {
      case 'ssh':
        const ssh = (formData as any).ssh_config;
        if (!ssh?.host) return setError('SSH host is required'), false;
        if (!ssh?.username) return setError('SSH username is required'), false;
        if (!ssh?.command) return setError('SSH command is required'), false;

        const authMethod = ssh.auth_method || 'password';
        if (authMethod === 'password' && !ssh?.password) {
          return setError('SSH password is required'), false;
        }
        if (authMethod === 'privatekey' && !ssh?.private_key) {
          return setError('SSH private key is required'), false;
        }
        break;

      case 'aws':
        const aws = (formData as any).aws_config;
        if (!aws?.access_key_id) return setError('AWS Access Key ID is required'), false;
        if (!aws?.secret_access_key) return setError('AWS Secret Access Key is required'), false;
        if (!aws?.region) return setError('AWS Region is required'), false;
        if (!aws?.service) return setError('AWS Service is required'), false;
        if (!aws?.resource_id) return setError('Resource ID is required'), false;
        break;

      case 'docker':
        const docker = (formData as any).docker_config;
        if (!docker?.connection_type) return setError('Docker connection type is required'), false;

        if (docker.connection_type === 'remote') {
          if (!docker.ssh_host) return setError('SSH host is required for remote Docker'), false;
          if (!docker.ssh_username) return setError('SSH username is required'), false;
          if (!docker.ssh_password) return setError('SSH password is required'), false;
        } else if (docker.connection_type === 'tcp') {
          if (!docker.docker_host) return setError('Docker host is required for TCP'), false;
        }
        break;

      case 'certificate':
        const cert = (formData as any).certificate_config;
        if (!cert?.hostname) return setError('Hostname is required'), false;

        const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!hostnameRegex.test(cert.hostname)) {
          return setError('Invalid hostname format'), false;
        }

        const port = cert.port || 443;
        if (port < 1 || port > 65535) return setError('Port must be between 1 and 65535'), false;

        if (cert.alarm_threshold_days && cert.warning_threshold_days &&
          cert.alarm_threshold_days >= cert.warning_threshold_days) {
          return setError('Alarm threshold must be less than warning threshold'), false;
        }
        break;

      case 'log':
        const log = (formData as any).log_config;
        if (!log?.log_path) return setError('Log file path is required'), false;

        if (log.is_remote) {
          if (!log.ssh_host) return setError('SSH host is required for remote logs'), false;
          if (!log.ssh_username) return setError('SSH username is required'), false;
          if (!log.ssh_password) return setError('SSH password is required'), false;
        }
        break;

      case 'api_post':
        try {
          JSON.parse((formData as any).post_body || '{}');
        } catch (e) {
          return setError('Invalid POST body JSON format'), false;
        }
        break;

      default:
        // For URL, ping, and other types
        if (!formData.monitor_instance?.trim()) {
          return setError('Monitor instance is required'), false;
        }
    }

    return true;
  };

  // Submit handler
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const url = mode === 'create' ? '/systemup/api/monitors' : `/systemup/api/monitors/${monitorId}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/monitors'), 1500);
      } else {
        setError(data.error || 'Failed to save monitor');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save monitor');
    } finally {
      setLoading(false);
    }
  };

  // Render monitor type specific config
  const renderMonitorConfig = () => {
    switch (formData.monitor_type) {
      case 'url':
        return <URLConfig formData={formData} setFormData={setFormData} />;
      case 'api_post':
        return <APIPostConfig formData={formData} setFormData={setFormData} />;
      case 'ssh':
        return <SSHConfig formData={formData} setFormData={setFormData} />;
      case 'aws':
        return <AWSConfig formData={formData} setFormData={setFormData} />;
      case 'docker':
        return <DockerConfig formData={formData} setFormData={setFormData} />;
      case 'certificate':
        return <CertificateConfig formData={formData} setFormData={setFormData} />;
      case 'log':
        return <LogConfig formData={formData} setFormData={setFormData} />;
      case 'ping':
        return <PingConfig formData={formData} setFormData={setFormData} />;
      default:
        return null;
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Monitor {mode === 'create' ? 'created' : 'updated'} successfully!
        </Alert>
      )}

      {/* Basic Information */}
      <BasicInfoSection formData={formData} setFormData={setFormData} />

      {/* Alarming & Dependencies */}
      <AlarmingSection formData={formData} setFormData={setFormData} />

      {/* Monitor Type Specific Configuration */}
      {renderMonitorConfig()}

      {/* Thresholds */}
      <ThresholdsSection formData={formData} setFormData={setFormData} />

      {/* Timing & Behavior */}
      <TimingSection formData={formData} setFormData={setFormData} />

      {/* Status */}
      <StatusSection formData={formData} setFormData={setFormData} />

      {/* Submit Buttons */}
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button
          variant="outlined"
          startIcon={<CancelIcon />}
          onClick={() => router.push('/monitors')}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={loading}
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Monitor' : 'Update Monitor'}
        </Button>
      </Stack>
    </Box>
  );
}