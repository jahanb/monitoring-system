// components/monitors/MonitorForm.tsx

'use client';
import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Chip,
  InputAdornment,
  Card,
  CardContent,
  Typography,
  Divider,
  Alert,
  Stack,
  IconButton,
  SelectChangeEvent
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Cloud as CloudIcon
} from '@mui/icons-material';
import { Monitor } from '@/lib/models/Monitor';
import { useRouter } from 'next/navigation';

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
        ...(initialData as any).post_body && { post_body: (initialData as any).post_body },
        ...(initialData as any).log_config && { log_config: (initialData as any).log_config },
        ...(initialData as any).certificate_config && { certificate_config: (initialData as any).certificate_config },
        ...(initialData as any).alert_settings && { alert_settings: (initialData as any).alert_settings },
        ...(initialData as any).gcp_config && { gcp_config: (initialData as any).gcp_config },
        ...(initialData as any).azure_config && { azure_config: (initialData as any).azure_config },
      }));
    }
  }, [initialData]);

  const [alarmingInput, setAlarmingInput] = useState('');
  const [alarmingEmailInput, setAlarmingEmailInput] = useState('');
  const [alarmingNameInput, setAlarmingNameInput] = useState('');
  const [alarmingMobileInput, setAlarmingMobileInput] = useState('');
  const [alarmingRoleInput, setAlarmingRoleInput] = useState('');
  const [dependencyInput, setDependencyInput] = useState('');
  const [statusCodeInput, setStatusCodeInput] = useState('');

  const handleChange = (field: keyof Monitor) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleNumberChange = (field: keyof Monitor) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value ? parseFloat(event.target.value) : undefined;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAlarmingCandidate = () => {
    if (!alarmingEmailInput.trim()) {
      return;
    }

    // Create contact object
    const contact = {
      name: alarmingNameInput.trim() || alarmingEmailInput.trim().split('@')[0],
      email: alarmingEmailInput.trim(),
      mobile: alarmingMobileInput.trim() || undefined,
      role: alarmingRoleInput.trim() || undefined
    };

    setFormData(prev => ({
      ...prev,
      alarming_candidate: [...(prev.alarming_candidate || []), contact]
    }));

    // Clear inputs
    setAlarmingNameInput('');
    setAlarmingEmailInput('');
    setAlarmingMobileInput('');
    setAlarmingRoleInput('');
  };

  const handleAddDependency = () => {
    if (dependencyInput.trim()) {
      setFormData(prev => ({
        ...prev,
        dependencies: [...(prev.dependencies || []), dependencyInput.trim()]
      }));
      setDependencyInput('');
    }
  };

  const handleAddStatusCode = () => {
    const code = parseInt(statusCodeInput);
    if (code && code >= 100 && code < 600) {
      setFormData(prev => ({
        ...prev,
        status_code: [...(prev.status_code || []), code]
      }));
      setStatusCodeInput('');
    }
  };

  const handleRemoveStatusCode = (index: number) => {
    setFormData(prev => ({
      ...prev,
      status_code: prev.status_code?.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
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

    // Validate based on monitor type
    if (formData.monitor_type === 'ssh') {
      const ssh = (formData as any).ssh_config;
      if (!ssh?.host) {
        setError('SSH host is required');
        return false;
      }
      if (!ssh?.username) {
        setError('SSH username is required');
        return false;
      }
      if (!ssh?.password) {
        setError('SSH password is required');
        return false;
      }
      if (!ssh?.command) {
        setError('SSH command is required');
        return false;
      }
    } else if (formData.monitor_type === 'aws') {
      const aws = (formData as any).aws_config;
      if (!aws?.access_key_id) {
        setError('AWS Access Key ID is required');
        return false;
      }
      if (!aws?.secret_access_key) {
        setError('AWS Secret Access Key is required');
        return false;
      }
      if (!aws?.region) {
        setError('AWS Region is required');
        return false;
      }
      if (!aws?.service) {
        setError('AWS Service is required');
        return false;
      }
      if (!aws?.resource_id) {
        setError('Resource ID is required');
        return false;
      }
    } else if (formData.monitor_type === 'certificate') {
      const cert = (formData as any).certificate_config;
      if (!cert?.hostname) {
        setError('Hostname is required for certificate monitoring');
        return false;
      }
      // Validate hostname format
      const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!hostnameRegex.test(cert.hostname)) {
        setError('Invalid hostname format (e.g., www.example.com)');
        return false;
      }
      const port = cert.port || 443;
      if (port < 1 || port > 65535) {
        setError('Port must be between 1 and 65535');
        return false;
      }
      if (cert.alarm_threshold_days && cert.alarm_threshold_days < 1) {
        setError('Alarm threshold must be at least 1 day');
        return false;
      }
      if (cert.warning_threshold_days && cert.warning_threshold_days < 1) {
        setError('Warning threshold must be at least 1 day');
        return false;
      }
      if (cert.alarm_threshold_days && cert.warning_threshold_days &&
        cert.alarm_threshold_days >= cert.warning_threshold_days) {
        setError('Alarm threshold must be less than warning threshold');
        return false;
      }
    } else if (formData.monitor_type === 'log') {
      const log = (formData as any).log_config;
      if (!log?.log_path) {
        setError('Log file path is required');
        return false;
      }
      if (log.is_remote) {
        if (!log.ssh_host) {
          setError('SSH host is required for remote logs');
          return false;
        }
        if (!log.ssh_username) {
          setError('SSH username is required for remote logs');
          return false;
        }
        if (!log.ssh_password) {
          setError('SSH password is required for remote logs');
          return false;
        }
      }
    } else if (formData.monitor_type === 'gcp') {
      const gcp = (formData as any).gcp_config;
      if (!gcp?.project_id) {
        setError('GCP Project ID is required');
        return false;
      }
      if (!gcp?.resource_type) {
        setError('GCP Resource Type is required');
        return false;
      }
      if (!gcp?.resource_id) {
        setError('GCP Resource ID is required');
        return false;
      }
      if (!gcp?.credentials_path) {
        setError('GCP Credentials Path is required');
        return false;
      }
    } else if (formData.monitor_type === 'azure') {
      const azure = (formData as any).azure_config;
      if (!azure?.subscription_id) {
        setError('Azure Subscription ID is required');
        return false;
      }
      if (!azure?.resource_group) {
        setError('Azure Resource Group is required');
        return false;
      }
      if (!azure?.resource_type) {
        setError('Azure Resource Type is required');
        return false;
      }
      if (!azure?.resource_name) {
        setError('Azure Resource Name is required');
        return false;
      }
      if (!azure?.tenant_id) {
        setError('Azure Tenant ID is required');
        return false;
      }
      if (!azure?.client_id) {
        setError('Azure Client ID is required');
        return false;
      }
      if (!azure?.client_secret) {
        setError('Azure Client Secret is required');
        return false;
      }
    } else {
      // For URL, API POST, and other types, monitor_instance is required
      if (!formData.monitor_instance?.trim()) {
        setError('Monitor instance is required');
        return false;
      }
    }

    // Validate POST body for api_post type
    if (formData.monitor_type === 'api_post') {
      try {
        JSON.parse((formData as any).post_body || '{}');
      } catch (e) {
        setError('Invalid POST body JSON format');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const url = mode === 'create' ? '/api/monitors' : `/api/monitors/${monitorId}`;
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

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>Monitor {mode === 'create' ? 'created' : 'updated'} successfully!</Alert>}

      {/* Basic Information */}
      < Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Basic Information</Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Monitor Name"
                value={formData.monitor_name}
                onChange={handleChange('monitor_name')}
                helperText="Unique name for this monitor"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Monitor Type</InputLabel>
                <Select value={formData.monitor_type} label="Monitor Type" onChange={handleChange('monitor_type')}>
                  <MenuItem value="url">URL / API Endpoint (GET)</MenuItem>
                  <MenuItem value="api_post">API POST Request</MenuItem>
                  <MenuItem value="certificate">🔒 SSL/TLS Certificate</MenuItem>  {/* ADD THIS */}
                  <MenuItem value="ssh">SSH Remote Command</MenuItem>
                  <MenuItem value="gcp">☁️ Google Cloud Platform</MenuItem>
                  <MenuItem value="azure">🔷 Microsoft Azure</MenuItem>
                  <MenuItem value="aws">AWS CloudWatch</MenuItem>
                  <MenuItem value="ping">Ping / ICMP</MenuItem>
                  <MenuItem value="log">Log File Analysis</MenuItem>
                  <MenuItem value="cpu">CPU Usage</MenuItem>
                  <MenuItem value="memory">Memory Usage</MenuItem>
                  <MenuItem value="disk">Disk Usage</MenuItem>
                  <MenuItem value="system_availability">System Availability</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Created By"
                value={formData.created_by}
                onChange={handleChange('created_by')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Business Owner"
                value={formData.business_owner}
                onChange={handleChange('business_owner')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Severity</InputLabel>
                <Select value={formData.severity} label="Severity" onChange={handleChange('severity')}>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {formData.monitor_type !== 'ssh' &&
              formData.monitor_type !== 'aws' &&
              formData.monitor_type !== 'certificate' &&
              formData.monitor_type !== 'log' && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Monitor Instance"
                    value={formData.monitor_instance}
                    onChange={handleChange('monitor_instance')}
                    helperText={
                      formData.monitor_type === 'url' || formData.monitor_type === 'api_post' ? 'URL to monitor' :
                        formData.monitor_type === 'ping' ? 'IP address or hostname to ping' :
                          'System name'
                    }
                    placeholder={
                      formData.monitor_type === 'ping' ? 'e.g., 8.8.8.8 or google.com' : undefined
                    }
                  />
                </Grid>
              )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={handleChange('description')}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card >

      {/* Alarming & Dependencies */}
      < Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Alarming & Dependencies</Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Alarming Contacts
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Add contacts who should receive alert notifications via email
              </Typography>

              <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Name"
                      value={alarmingNameInput}
                      onChange={(e) => setAlarmingNameInput(e.target.value)}
                      placeholder="John Doe"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      size="small"
                      label="Email"
                      type="email"
                      value={alarmingEmailInput}
                      onChange={(e) => setAlarmingEmailInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAlarmingCandidate())}
                      placeholder="john@example.com"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Mobile (Optional)"
                      value={alarmingMobileInput}
                      onChange={(e) => setAlarmingMobileInput(e.target.value)}
                      placeholder="+1234567890"
                      helperText="For future SMS notifications"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Role (Optional)"
                      value={alarmingRoleInput}
                      onChange={(e) => setAlarmingRoleInput(e.target.value)}
                      placeholder="Primary, On-Call, etc."
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAddAlarmingCandidate}
                      disabled={!alarmingEmailInput.trim()}
                      fullWidth
                    >
                      Add Contact
                    </Button>
                  </Grid>
                </Grid>
              </Card>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {formData.alarming_candidate?.map((contact: any, i) => {
                  const isString = typeof contact === 'string';
                  const displayName = isString ? contact : contact.name || contact.email;
                  const displayEmail = isString ? contact : contact.email;
                  const displayMobile = isString ? null : contact.mobile;
                  const displayRole = isString ? null : contact.role;

                  return (
                    <Card key={i} variant="outlined" sx={{ p: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {displayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            📧 {displayEmail}
                          </Typography>
                          {displayMobile && (
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                              📱 {displayMobile}
                            </Typography>
                          )}
                          {displayRole && (
                            <Chip label={displayRole} size="small" sx={{ ml: 1 }} />
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => setFormData(p => ({
                            ...p,
                            alarming_candidate: p.alarming_candidate?.filter((_, idx) => idx !== i)
                          }))}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Card>
                  );
                })}
                {(!formData.alarming_candidate || formData.alarming_candidate.length === 0) && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No contacts added yet
                  </Typography>
                )}
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dependencies"
                value={dependencyInput}
                onChange={(e) => setDependencyInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDependency())}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleAddDependency}><AddIcon /></IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.dependencies?.map((d, i) => (
                  <Chip
                    key={i}
                    label={d}
                    onDelete={() => setFormData(p => ({ ...p, dependencies: p.dependencies?.filter((_, idx) => idx !== i) }))}
                    color="secondary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card >

      {/* AWS Settings */}
      {
        formData.monitor_type === 'aws' && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CloudIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">AWS CloudWatch Configuration</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Monitor AWS resources (EC2, RDS, Lambda) using CloudWatch metrics
                  </Alert>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>AWS Service</InputLabel>
                    <Select
                      value={(formData as any).aws_config?.service || ''}
                      label="AWS Service"
                      onChange={(e) => {
                        const service = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          aws_config: {
                            ...(prev as any).aws_config,
                            service,
                            metric_name: service === 'lambda' ? 'Errors' : 'CPUUtilization'
                          }
                        }));
                      }}
                    >
                      <MenuItem value="ec2">EC2 - Elastic Compute Cloud</MenuItem>
                      <MenuItem value="rds">RDS - Relational Database</MenuItem>
                      <MenuItem value="lambda">Lambda - Serverless Functions</MenuItem>
                    </Select>
                    <FormHelperText>Select the AWS service to monitor</FormHelperText>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="AWS Region"
                    value={(formData as any).aws_config?.region || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      aws_config: { ...(prev as any).aws_config, region: e.target.value }
                    }))}
                    placeholder="us-east-1"
                    helperText="e.g., us-east-1, eu-west-1"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Resource ID"
                    value={(formData as any).aws_config?.resource_id || ''}
                    onChange={(e) => {
                      const resourceId = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        monitor_instance: resourceId,
                        aws_config: { ...(prev as any).aws_config, resource_id: resourceId }
                      }));
                    }}
                    placeholder={
                      (formData as any).aws_config?.service === 'ec2' ? 'i-0123456789abcdef0' :
                        (formData as any).aws_config?.service === 'rds' ? 'mydb-instance' :
                          (formData as any).aws_config?.service === 'lambda' ? 'my-function-name' :
                            'Resource identifier'
                    }
                    helperText={
                      (formData as any).aws_config?.service === 'ec2' ? 'EC2 Instance ID (e.g., i-0123456789abcdef0)' :
                        (formData as any).aws_config?.service === 'rds' ? 'RDS DB Instance Identifier' :
                          (formData as any).aws_config?.service === 'lambda' ? 'Lambda Function Name' :
                            'Enter the resource identifier'
                    }
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Access Key ID"
                    value={(formData as any).aws_config?.access_key_id || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      aws_config: { ...(prev as any).aws_config, access_key_id: e.target.value }
                    }))}
                    helperText="AWS IAM Access Key ID"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    type="password"
                    label="Secret Access Key"
                    value={(formData as any).aws_config?.secret_access_key || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      aws_config: { ...(prev as any).aws_config, secret_access_key: e.target.value }
                    }))}
                    helperText="AWS IAM Secret Access Key"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Metric Name"
                    value={(formData as any).aws_config?.metric_name || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      aws_config: { ...(prev as any).aws_config, metric_name: e.target.value }
                    }))}
                    placeholder={
                      (formData as any).aws_config?.service === 'lambda' ? 'Errors' : 'CPUUtilization'
                    }
                    helperText="CloudWatch metric to monitor (optional, has defaults)"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="warning">
                    <Typography variant="body2" gutterBottom>
                      <strong>IAM Permissions Required:</strong>
                    </Typography>
                    <Typography variant="body2" component="div">
                      The IAM user needs these permissions:
                      <ul style={{ marginTop: 4, marginBottom: 0 }}>
                        {(formData as any).aws_config?.service === 'ec2' && (
                          <>
                            <li>cloudwatch:GetMetricStatistics</li>
                            <li>ec2:DescribeInstances</li>
                            <li>ec2:DescribeInstanceStatus</li>
                          </>
                        )}
                        {(formData as any).aws_config?.service === 'rds' && (
                          <>
                            <li>cloudwatch:GetMetricStatistics</li>
                            <li>rds:DescribeDBInstances</li>
                          </>
                        )}
                        {(formData as any).aws_config?.service === 'lambda' && (
                          <>
                            <li>cloudwatch:GetMetricStatistics</li>
                            <li>lambda:GetFunction</li>
                          </>
                        )}
                        {!(formData as any).aws_config?.service && (
                          <li>Select a service to see required permissions</li>
                        )}
                      </ul>
                    </Typography>
                  </Alert>
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Available Metrics by Service:</strong>
                    </Typography>
                    <Typography variant="body2" component="div">
                      <ul style={{ marginTop: 4, marginBottom: 0 }}>
                        <li><strong>EC2:</strong> CPUUtilization, NetworkIn, NetworkOut, DiskReadBytes, DiskWriteBytes</li>
                        <li><strong>RDS:</strong> CPUUtilization, DatabaseConnections, FreeStorageSpace, ReadLatency</li>
                        <li><strong>Lambda:</strong> Errors, Duration, Invocations, Throttles, ConcurrentExecutions</li>
                      </ul>
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )
      }

      {/* Ping Settings */}
      {
        formData.monitor_type === 'ping' && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">🏓 Ping Configuration</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Ping monitoring checks network connectivity and measures latency (response time) to a host or IP address.
                  </Alert>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Packet Count"
                    value={(formData as any).ping_config?.count || 4}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ping_config: { ...(prev as any).ping_config, count: parseInt(e.target.value) || 4 }
                    }))}
                    helperText="Number of ping packets to send"
                    inputProps={{ min: 1, max: 10 }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Timeout"
                    value={(formData as any).ping_config?.timeout || 5}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ping_config: { ...(prev as any).ping_config, timeout: parseInt(e.target.value) || 5 }
                    }))}
                    helperText="Timeout per packet (seconds)"
                    InputProps={{ endAdornment: <InputAdornment position="end">sec</InputAdornment> }}
                    inputProps={{ min: 1, max: 30 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="warning">
                    <Typography variant="body2">
                      <strong>Network Requirements:</strong>
                    </Typography>
                    <Typography variant="body2" component="div">
                      <ul style={{ marginTop: 4, marginBottom: 0 }}>
                        <li>ICMP (ping) packets must be allowed through firewalls</li>
                        <li>Some hosts may block ICMP requests for security</li>
                        <li>Running on Windows requires no special permissions</li>
                        <li>On Linux/macOS, may require root privileges for raw sockets</li>
                      </ul>
                    </Typography>
                  </Alert>
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Threshold Guidelines for Ping (in milliseconds):</strong>
                    </Typography>
                    <Typography variant="body2" component="div">
                      <ul style={{ marginTop: 4, marginBottom: 0 }}>
                        <li><strong>Excellent:</strong> &lt; 30ms (local network)</li>
                        <li><strong>Good:</strong> 30-100ms (same region)</li>
                        <li><strong>Fair:</strong> 100-200ms (different region)</li>
                        <li><strong>Poor:</strong> &gt; 200ms (may indicate issues)</li>
                      </ul>
                      Set your thresholds below based on expected latency to this host.
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )
      }

      {/* Log File Analysis Settings */}
      {
        formData.monitor_type === 'log' && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">📄 Log File Analysis Configuration</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Analyze log files for error patterns and get AI-powered solution suggestions
                  </Alert>
                </Grid>

                {/* Log Location Type */}
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Log File Location</InputLabel>
                    <Select
                      value={(formData as any).log_config?.is_remote ? 'remote' : 'local'}
                      label="Log File Location"
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        log_config: {
                          ...(prev as any).log_config,
                          is_remote: e.target.value === 'remote'
                        }
                      }))}
                    >
                      <MenuItem value="local">Local File System</MenuItem>
                      <MenuItem value="remote">Remote Server (SSH)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* SSH Configuration for Remote Logs */}
                {(formData as any).log_config?.is_remote && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        required
                        label="SSH Host"
                        value={(formData as any).log_config?.ssh_host || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          log_config: { ...(prev as any).log_config, ssh_host: e.target.value }
                        }))}
                        placeholder="192.168.1.100 or server.example.com"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="SSH Port"
                        value={(formData as any).log_config?.ssh_port || 22}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          log_config: { ...(prev as any).log_config, ssh_port: parseInt(e.target.value) }
                        }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        required
                        label="SSH Username"
                        value={(formData as any).log_config?.ssh_username || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          log_config: { ...(prev as any).log_config, ssh_username: e.target.value }
                        }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        required
                        type="password"
                        label="SSH Password"
                        value={(formData as any).log_config?.ssh_password || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          log_config: { ...(prev as any).log_config, ssh_password: e.target.value }
                        }))}
                      />
                    </Grid>
                  </>
                )}

                {/* Log File Path */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Log File Path"
                    value={(formData as any).log_config?.log_path || ''}
                    onChange={(e) => {
                      const logPath = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        monitor_instance: logPath, // Auto-set monitor_instance
                        log_config: { ...(prev as any).log_config, log_path: logPath }
                      }));
                    }}
                    placeholder="/var/log/app/error.log or C:\logs\app.log"
                    helperText="Full path to the log file to analyze"
                  />
                </Grid>

                {/* Lines to Analyze */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Lines to Analyze"
                    value={(formData as any).log_config?.tail_lines || 100}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      log_config: { ...(prev as any).log_config, tail_lines: parseInt(e.target.value) }
                    }))}
                    helperText="Number of recent lines to check (tail)"
                    inputProps={{ min: 10, max: 10000 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="success">
                    <Typography variant="body2" gutterBottom>
                      <strong>✨ Built-in Error Detection:</strong>
                    </Typography>
                    <Typography variant="caption" component="div">
                      The log checker automatically detects common issues:
                      <ul style={{ marginTop: 4, marginBottom: 0, paddingLeft: 20 }}>
                        <li>Memory issues (OOM, memory leaks)</li>
                        <li>Connection problems (refused, timeout)</li>
                        <li>Disk space issues</li>
                        <li>Permission errors</li>
                        <li>Database errors</li>
                        <li>SSL/Certificate issues</li>
                        <li>500 errors and server crashes</li>
                      </ul>
                      Each issue comes with recommended solutions!
                    </Typography>
                  </Alert>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Custom Error Patterns (Optional)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Add specific patterns to watch for in your logs
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Pattern (RegEx)"
                      placeholder="CRITICAL|FATAL|Exception"
                      helperText="Regular expression to match error lines"
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                    >
                      Add Custom Pattern
                    </Button>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="warning">
                    <Typography variant="body2">
                      <strong>📝 Note:</strong> For large log files (&gt;10MB), only the last {(formData as any).log_config?.tail_lines || 100} lines will be analyzed to ensure quick checks.
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )
      }
// Add this section to MonitorForm.tsx after the Log File Analysis section
      // Place it before the URL Settings section

      {/* Certificate Monitoring Settings */}
      {
        formData.monitor_type === 'certificate' && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">🔒 SSL/TLS Certificate Monitoring</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Monitor SSL/TLS certificate expiration and get daily alerts when renewal is needed.
                    Perfect for preventing certificate expiration incidents.
                  </Alert>
                </Grid>

                {/* Hostname */}
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    required
                    label="Hostname / Domain"
                    value={(formData as any).certificate_config?.hostname || ''}
                    onChange={(e) => {
                      const hostname = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        monitor_instance: hostname, // Auto-set monitor_instance
                        certificate_config: {
                          ...(prev as any).certificate_config,
                          hostname
                        }
                      }));
                    }}
                    placeholder="www.example.com"
                    helperText="Domain name or hostname to check (without https://)"
                  />
                </Grid>

                {/* Port */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Port"
                    value={(formData as any).certificate_config?.port || 443}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      certificate_config: {
                        ...(prev as any).certificate_config,
                        port: parseInt(e.target.value) || 443
                      }
                    }))}
                    helperText="SSL/TLS port"
                    inputProps={{ min: 1, max: 65535 }}
                  />
                </Grid>

                {/* Warning Threshold */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Warning Threshold"
                    value={(formData as any).certificate_config?.warning_threshold_days || 30}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      certificate_config: {
                        ...(prev as any).certificate_config,
                        warning_threshold_days: parseInt(e.target.value) || 30
                      }
                    }))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">days</InputAdornment>
                    }}
                    helperText="Send warning when expiring in X days"
                    inputProps={{ min: 1, max: 365 }}
                  />
                </Grid>

                {/* Alarm Threshold */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Alarm Threshold"
                    value={(formData as any).certificate_config?.alarm_threshold_days || 7}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      certificate_config: {
                        ...(prev as any).certificate_config,
                        alarm_threshold_days: parseInt(e.target.value) || 7
                      }
                    }))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">days</InputAdornment>
                    }}
                    helperText="Send alarm when expiring in X days"
                    inputProps={{ min: 1, max: 90 }}
                  />
                </Grid>

                {/* Connection Timeout */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Connection Timeout"
                    value={(formData as any).certificate_config?.timeout || 30}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      certificate_config: {
                        ...(prev as any).certificate_config,
                        timeout: parseInt(e.target.value) || 30
                      }
                    }))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">seconds</InputAdornment>
                    }}
                    helperText="Time to wait for connection"
                    inputProps={{ min: 5, max: 120 }}
                  />
                </Grid>

                {/* Check Certificate Chain */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Check Certificate Chain</InputLabel>
                    <Select
                      value={(formData as any).certificate_config?.check_chain !== false ? 'yes' : 'no'}
                      label="Check Certificate Chain"
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        certificate_config: {
                          ...(prev as any).certificate_config,
                          check_chain: e.target.value === 'yes'
                        }
                      }))}
                    >
                      <MenuItem value="yes">Yes - Check entire chain</MenuItem>
                      <MenuItem value="no">No - Check only main cert</MenuItem>
                    </Select>
                    <FormHelperText>
                      Verify intermediate certificates too
                    </FormHelperText>
                  </FormControl>
                </Grid>

                {/* Daily Reminders Toggle */}
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ p: 2, bgcolor: '#fef3c7' }}>
                    <FormControl fullWidth>
                      <InputLabel>Daily Reminder Notifications</InputLabel>
                      <Select
                        value={(formData as any).alert_settings?.send_daily_reminder ? 'enabled' : 'disabled'}
                        label="Daily Reminder Notifications"
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          alert_settings: {
                            ...(prev as any).alert_settings,
                            enabled: true,
                            send_daily_reminder: e.target.value === 'enabled'
                          }
                        }))}
                      >
                        <MenuItem value="enabled">
                          📅 Enabled - Send daily alerts when critical
                        </MenuItem>
                        <MenuItem value="disabled">
                          ❌ Disabled - Send alert only once
                        </MenuItem>
                      </Select>
                      <FormHelperText>
                        When certificate is within alarm threshold (&lt; {(formData as any).certificate_config?.alarm_threshold_days || 7} days),
                        send daily reminder emails to ensure timely renewal
                      </FormHelperText>
                    </FormControl>
                  </Card>
                </Grid>

                {/* Threshold Presets */}
                <Grid item xs={12}>
                  <Alert severity="success">
                    <Typography variant="body2" gutterBottom>
                      <strong>📊 Recommended Threshold Presets:</strong>
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          certificate_config: {
                            ...(prev as any).certificate_config,
                            warning_threshold_days: 30,
                            alarm_threshold_days: 7
                          },
                          period_in_minute: 60
                        }))}
                      >
                        🔴 Production Critical (30/7 days)
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          certificate_config: {
                            ...(prev as any).certificate_config,
                            warning_threshold_days: 45,
                            alarm_threshold_days: 14
                          },
                          period_in_minute: 360
                        }))}
                      >
                        🟡 Standard (45/14 days)
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          certificate_config: {
                            ...(prev as any).certificate_config,
                            warning_threshold_days: 15,
                            alarm_threshold_days: 5
                          },
                          period_in_minute: 1440
                        }))}
                      >
                        🟢 Internal (15/5 days)
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          certificate_config: {
                            ...(prev as any).certificate_config,
                            warning_threshold_days: 30,
                            alarm_threshold_days: 7
                          },
                          period_in_minute: 720
                        }))}
                      >
                        🔵 Let's Encrypt (30/7 days)
                      </Button>
                    </Stack>
                  </Alert>
                </Grid>

                {/* Info Cards */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle2" gutterBottom color="primary">
                      ✅ What Gets Checked
                    </Typography>
                    <Typography variant="caption" component="div" color="text.secondary">
                      <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                        <li>Days until certificate expiration</li>
                        <li>Certificate issuer and subject</li>
                        <li>Subject Alternative Names (SANs)</li>
                        <li>Certificate chain validity</li>
                        <li>Hostname match verification</li>
                        <li>Self-signed certificate detection</li>
                      </ul>
                    </Typography>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle2" gutterBottom color="error">
                      🚨 Alert Behavior
                    </Typography>
                    <Typography variant="caption" component="div" color="text.secondary">
                      <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                        <li><strong>Warning:</strong> First alert at {(formData as any).certificate_config?.warning_threshold_days || 30} days</li>
                        <li><strong>Alarm:</strong> Escalates at {(formData as any).certificate_config?.alarm_threshold_days || 7} days</li>
                        <li><strong>Daily Reminders:</strong> When enabled, sends daily emails during alarm period</li>
                        <li><strong>Expired:</strong> Immediate critical alert</li>
                        <li><strong>Recovery:</strong> Notification sent when renewed</li>
                      </ul>
                    </Typography>
                  </Card>
                </Grid>

                {/* Examples */}
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2" gutterBottom>
                      <strong>💡 Common Use Cases:</strong>
                    </Typography>
                    <Typography variant="caption" component="div">
                      <ul style={{ marginTop: 4, marginBottom: 0, paddingLeft: 20 }}>
                        <li><strong>E-commerce sites:</strong> Monitor checkout.example.com with 45/14 day thresholds</li>
                        <li><strong>APIs:</strong> Monitor api.example.com with daily reminders enabled</li>
                        <li><strong>CDN:</strong> Monitor cdn.example.com (wildcard cert covers *.example.com)</li>
                        <li><strong>Internal services:</strong> Monitor internal-app.local:8443 (custom port)</li>
                        <li><strong>Let's Encrypt:</strong> 90-day certs - set 30/7 day thresholds for buffer</li>
                      </ul>
                    </Typography>
                  </Alert>
                </Grid>

                {/* Testing Section */}
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ p: 2, bgcolor: '#f0f9ff' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      🧪 Test Before Saving
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                      Test the certificate connection to verify your configuration:
                    </Typography>
                    <code style={{
                      display: 'block',
                      padding: '8px',
                      background: '#1f2937',
                      color: '#f3f4f6',
                      borderRadius: '4px',
                      fontSize: '11px',
                      marginTop: '8px'
                    }}>
                      openssl s_client -connect {(formData as any).certificate_config?.hostname || 'example.com'}:{(formData as any).certificate_config?.port || 443} -servername {(formData as any).certificate_config?.hostname || 'example.com'} &lt; /dev/null 2&gt;/dev/null | openssl x509 -noout -dates
                    </code>
                  </Card>
                </Grid>

                {/* Warning about check intervals */}
                <Grid item xs={12}>
                  <Alert severity="warning">
                    <Typography variant="body2">
                      <strong>⏰ Important:</strong> For daily reminders to work effectively:
                    </Typography>
                    <Typography variant="caption" component="div">
                      <ul style={{ marginTop: 4, marginBottom: 0, paddingLeft: 20 }}>
                        <li>Set check period (below) to run at least once per day</li>
                        <li>For critical certificates, check hourly (60 minutes) during alarm period</li>
                        <li>Daily reminders will be sent 20+ hours after last notification</li>
                        <li>Reminders continue until certificate is renewed or monitor is disabled</li>
                      </ul>
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )
      }
      {/* URL Settings */}
      {
        formData.monitor_type === 'url' && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>URL Monitoring Settings</Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Status Codes"
                    value={statusCodeInput}
                    onChange={(e) => setStatusCodeInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStatusCode())}
                    type="number"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={handleAddStatusCode}><AddIcon /></IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {formData.status_code?.map((c, i) => (
                      <Chip key={i} label={c} onDelete={() => handleRemoveStatusCode(i)} color="success" />
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Positive Pattern"
                    value={formData.positive_pattern}
                    onChange={handleChange('positive_pattern')}
                    helperText="Regex that SHOULD appear"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Negative Pattern"
                    value={formData.negative_pattern}
                    onChange={handleChange('negative_pattern')}
                    helperText="Regex that SHOULD NOT appear"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )
      }

      {/* API POST Settings */}
      {
        formData.monitor_type === 'api_post' && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>API POST Settings</Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    label="POST Body (JSON)"
                    value={(formData as any).post_body || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, post_body: e.target.value }))}
                    helperText="JSON body to send with POST request"
                    placeholder='{"username": "test", "password": "test123"}'
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Expected Status Codes"
                    value={statusCodeInput}
                    onChange={(e) => setStatusCodeInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStatusCode())}
                    type="number"
                    helperText="HTTP status codes (200, 201, etc.)"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={handleAddStatusCode}><AddIcon /></IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {formData.status_code?.map((code, index) => (
                      <Chip
                        key={index}
                        label={code}
                        onDelete={() => handleRemoveStatusCode(index)}
                        color="success"
                      />
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Positive Pattern"
                    value={formData.positive_pattern}
                    onChange={handleChange('positive_pattern')}
                    helperText="Regex that SHOULD appear in response"
                    placeholder='e.g., "success":true or token'
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Negative Pattern"
                    value={formData.negative_pattern}
                    onChange={handleChange('negative_pattern')}
                    helperText="Regex that SHOULD NOT appear"
                    placeholder='e.g., error|exception|failed'
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )
      }

      {/* SSH Settings */}
      {
        formData.monitor_type === 'ssh' && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>SSH Configuration</Typography>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Host / IP Address"
                    value={(formData as any).ssh_config?.host || ''}
                    onChange={(e) => {
                      const host = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        monitor_instance: host,
                        ssh_config: { ...(prev as any).ssh_config, host }
                      }));
                    }}
                    helperText="e.g., 192.168.1.100 or server.example.com"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Port"
                    value={(formData as any).ssh_config?.port || 22}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ssh_config: { ...(prev as any).ssh_config, port: parseInt(e.target.value) }
                    }))}
                    helperText="Default: 22"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Username"
                    value={(formData as any).ssh_config?.username || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ssh_config: { ...(prev as any).ssh_config, username: e.target.value }
                    }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    type="password"
                    label="Password"
                    value={(formData as any).ssh_config?.password || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ssh_config: { ...(prev as any).ssh_config, password: e.target.value }
                    }))}
                    helperText="SSH password"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Command or Script Path"
                    value={(formData as any).ssh_config?.command || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      ssh_config: { ...(prev as any).ssh_config, command: e.target.value }
                    }))}
                    helperText="e.g., /home/user/scripts/check_resources.sh or uptime"
                    placeholder="/opt/scripts/system_check.sh"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2" gutterBottom>
                      <strong>Script Output Format:</strong>
                    </Typography>
                    <Typography variant="body2" component="div">
                      Your script should output metrics in one of these formats:
                      <ul style={{ marginTop: 8, marginBottom: 0 }}>
                        <li>CPU: 90%</li>
                        <li>Memory: 85%</li>
                        <li>Disk: 75%</li>
                      </ul>
                      Or: <code>cpu=90 memory=85 disk=75</code>
                    </Typography>
                  </Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Positive Pattern"
                    value={formData.positive_pattern}
                    onChange={handleChange('positive_pattern')}
                    helperText="Regex that SHOULD appear (optional)"
                    placeholder="success|ok|completed"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Negative Pattern"
                    value={formData.negative_pattern}
                    onChange={handleChange('negative_pattern')}
                    helperText="Regex that SHOULD NOT appear (optional)"
                    placeholder="error|failed|exception"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )
      }

      {/* GCP Configuration Section */}
      {
        formData.monitor_type === 'gcp' && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ☁️ Google Cloud Platform Configuration
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Alert severity="info" sx={{ mb: 2 }}>
                Monitor GCP resources with AI-powered root cause analysis
              </Alert>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Project ID"
                    value={(formData as any).gcp_config?.project_id || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      gcp_config: { ...(prev as any).gcp_config, project_id: e.target.value }
                    }))}
                    helperText="Your GCP project ID"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Resource Type</InputLabel>
                    <Select
                      value={(formData as any).gcp_config?.resource_type || ''}
                      label="Resource Type"
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        gcp_config: { ...(prev as any).gcp_config, resource_type: e.target.value }
                      }))}
                    >
                      <MenuItem value="compute">Compute Engine (VM)</MenuItem>
                      <MenuItem value="cloudrun">Cloud Run</MenuItem>
                      <MenuItem value="cloudfunctions">Cloud Functions</MenuItem>
                      <MenuItem value="cloudsql">Cloud SQL</MenuItem>
                      <MenuItem value="gke">Kubernetes Engine</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Resource ID"
                    value={(formData as any).gcp_config?.resource_id || ''}
                    onChange={(e) => {
                      const resourceId = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        monitor_instance: resourceId,
                        gcp_config: { ...(prev as any).gcp_config, resource_id: resourceId }
                      }));
                    }}
                    helperText="Instance name or resource identifier"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Region"
                    value={(formData as any).gcp_config?.region || 'us-central1'}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      gcp_config: { ...(prev as any).gcp_config, region: e.target.value }
                    }))}
                    helperText="GCP region (e.g., us-central1)"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Service Account Credentials Path"
                    value={(formData as any).gcp_config?.credentials_path || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      gcp_config: { ...(prev as any).gcp_config, credentials_path: e.target.value }
                    }))}
                    helperText="Path to service account JSON key file"
                    placeholder="/path/to/service-account.json"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="success">
                    <Typography variant="body2" gutterBottom>
                      <strong>🤖 AI-Powered Features:</strong>
                    </Typography>
                    <Typography variant="caption">
                      Automatic root cause analysis, metric correlation, and intelligent recommendations
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )
      }

      {/* Azure Configuration Section */}
      {
        formData.monitor_type === 'azure' && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔷 Microsoft Azure Configuration
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Alert severity="info" sx={{ mb: 2 }}>
                Monitor Azure resources with AI-powered analysis and cost insights
              </Alert>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Subscription ID"
                    value={(formData as any).azure_config?.subscription_id || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      azure_config: { ...(prev as any).azure_config, subscription_id: e.target.value }
                    }))}
                    helperText="Azure subscription ID"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Resource Group"
                    value={(formData as any).azure_config?.resource_group || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      azure_config: { ...(prev as any).azure_config, resource_group: e.target.value }
                    }))}
                    helperText="Resource group name"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Resource Type</InputLabel>
                    <Select
                      value={(formData as any).azure_config?.resource_type || ''}
                      label="Resource Type"
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        azure_config: { ...(prev as any).azure_config, resource_type: e.target.value }
                      }))}
                    >
                      <MenuItem value="vm">Virtual Machine</MenuItem>
                      <MenuItem value="appservice">App Service</MenuItem>
                      <MenuItem value="function">Azure Function</MenuItem>
                      <MenuItem value="sqldb">SQL Database</MenuItem>
                      <MenuItem value="storage">Storage Account</MenuItem>
                      <MenuItem value="aks">Kubernetes Service</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Resource Name"
                    value={(formData as any).azure_config?.resource_name || ''}
                    onChange={(e) => {
                      const resourceName = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        monitor_instance: resourceName,
                        azure_config: { ...(prev as any).azure_config, resource_name: resourceName }
                      }));
                    }}
                    helperText="Resource name in Azure"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Tenant ID"
                    value={(formData as any).azure_config?.tenant_id || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      azure_config: { ...(prev as any).azure_config, tenant_id: e.target.value }
                    }))}
                    helperText="Azure AD tenant ID"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Client ID"
                    value={(formData as any).azure_config?.client_id || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      azure_config: { ...(prev as any).azure_config, client_id: e.target.value }
                    }))}
                    helperText="Application (client) ID"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    type="password"
                    label="Client Secret"
                    value={(formData as any).azure_config?.client_secret || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      azure_config: { ...(prev as any).azure_config, client_secret: e.target.value }
                    }))}
                    helperText="Application client secret"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Alert severity="success">
                    <Typography variant="body2" gutterBottom>
                      <strong>🤖 AI-Powered Features:</strong>
                    </Typography>
                    <Typography variant="caption">
                      Root cause analysis, cost optimization recommendations, and performance insights
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )
      }

      {/* Thresholds */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Thresholds</Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Low Warning"
                value={formData.low_value_threshold_warning || ''}
                onChange={handleNumberChange('low_value_threshold_warning')}
                InputProps={{
                  endAdornment: <InputAdornment position="end">
                    {formData.monitor_type === 'url' || formData.monitor_type === 'api_post' || formData.monitor_type === 'ping' ? 'ms' : '%'}
                  </InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="High Warning"
                value={formData.high_value_threshold_warning || ''}
                onChange={handleNumberChange('high_value_threshold_warning')}
                InputProps={{
                  endAdornment: <InputAdornment position="end">
                    {formData.monitor_type === 'url' || formData.monitor_type === 'api_post' || formData.monitor_type === 'ping' ? 'ms' : '%'}
                  </InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Low Alarm"
                value={formData.low_value_threshold_alarm || ''}
                onChange={handleNumberChange('low_value_threshold_alarm')}
                InputProps={{
                  endAdornment: <InputAdornment position="end">
                    {formData.monitor_type === 'url' || formData.monitor_type === 'api_post' || formData.monitor_type === 'ping' ? 'ms' : '%'}
                  </InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Low Warning"
                value={formData.low_value_threshold_warning || ''}
                onChange={handleNumberChange('low_value_threshold_warning')}
                InputProps={{
                  endAdornment: <InputAdornment position="end">
                    {formData.monitor_type === 'certificate' ? 'days' :
                      formData.monitor_type === 'url' || formData.monitor_type === 'api_post' || formData.monitor_type === 'ping' ? 'ms' :
                        '%'}
                  </InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="High Alarm"
                value={formData.high_value_threshold_alarm || ''}
                onChange={handleNumberChange('high_value_threshold_alarm')}
                InputProps={{
                  endAdornment: <InputAdornment position="end">
                    {formData.monitor_type === 'url' || formData.monitor_type === 'api_post' || formData.monitor_type === 'ping' ? 'ms' : '%'}
                  </InputAdornment>
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Timing */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Timing & Behavior</Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                required
                label="Check Period"
                value={formData.period_in_minute}
                onChange={handleNumberChange('period_in_minute')}
                InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                required
                label="Timeout"
                value={formData.timeout_in_second}
                onChange={handleNumberChange('timeout_in_second')}
                InputProps={{ endAdornment: <InputAdornment position="end">sec</InputAdornment> }}
                inputProps={{ min: 5 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                required
                label="Consecutive Warnings"
                value={formData.consecutive_warning}
                onChange={handleNumberChange('consecutive_warning')}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                required
                label="Consecutive Alarms"
                value={formData.consecutive_alarm}
                onChange={handleNumberChange('consecutive_alarm')}
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Recovery */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Recovery & Notifications</Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Recovery Action"
                value={formData.recovery_action}
                onChange={handleChange('recovery_action')}
                helperText="Script or action name"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                required
                label="Alarm After N Failures"
                value={formData.alarm_after_n_failure}
                onChange={handleNumberChange('alarm_after_n_failure')}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                required
                label="Reset After M OK"
                value={formData.reset_after_m_ok}
                onChange={handleNumberChange('reset_after_m_ok')}
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Monitor Status</Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Active Status</InputLabel>
                <Select
                  value={formData.active_disable ? 'active' : 'disabled'}
                  label="Active Status"
                  onChange={(e) => setFormData(p => ({ ...p, active_disable: e.target.value === 'active' }))}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="disabled">Disabled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Running Status</InputLabel>
                <Select
                  value={formData.running_stopped ? 'running' : 'stopped'}
                  label="Running Status"
                  onChange={(e) => setFormData(p => ({ ...p, running_stopped: e.target.value === 'running' }))}
                >
                  <MenuItem value="running">Running</MenuItem>
                  <MenuItem value="stopped">Stopped</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => router.push('/monitors')} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={loading}>
          {loading ? 'Saving...' : mode === 'create' ? 'Create Monitor' : 'Update Monitor'}
        </Button>
      </Stack>
    </Box >
  );
}