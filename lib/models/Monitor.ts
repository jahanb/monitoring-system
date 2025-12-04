// lib/models/Monitor.ts
export interface Monitor {
  _id?: string;
  monitor_name: string;
  monitor_type: 'url' | 'cpu' | 'memory' | 'system_availability' | 'disk' | 'custom' | 'ssh' | 'docker' | 'certificate' | 'gcp' | 'azure' | 'aws' | 'ping' | 'log' | 'api_post';
  creation_date_time: Date;
  created_by: string;
  business_owner: string;
  dependencies: string[];  // Related systems/apps
  description: string;
  alarming_candidate?: string[] | AlarmingContact[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  monitor_instance: string;  // URL, system name, or app name
  ssh_config?: SshConfig;
  certificate_config?: CertificateConfig;
  gcp_config?: GcpConfig;
  azure_config?: AzureConfig;
  aws_config?: AwsConfig;
  ping_config?: PingConfig;
  log_config?: LogConfig;
  alert_settings?: AlertSettings;

  notification_settings?: {
    warning_channels: ('email' | 'sms' | 'call' | 'slack' | 'webhook')[];
    alarm_channels: ('email' | 'sms' | 'call' | 'slack' | 'webhook')[];
    enable_escalation?: boolean;  // Escalate from warning to alarm channels
    escalation_delay_minutes?: number;  // Wait X minutes before escalating
  };

  // Pattern matching for URL/response monitoring
  negative_pattern?: string;  // Pattern that should NOT appear
  positive_pattern?: string;  // Pattern that SHOULD appear
  //post body
  post_body?: string;
  // Thresholds
  low_value_threshold_warning?: number;
  high_value_threshold_warning?: number;
  low_value_threshold_alarm?: number;
  high_value_threshold_alarm?: number;


  // Consecutive checks
  consecutive_warning: number;
  consecutive_alarm: number;

  // URL specific
  status_code?: number[];  // Expected status codes (e.g., [200, 201])

  // Timing
  period_in_minute: number;
  timeout_in_second: number;

  // Recovery
  recovery_action?: string;  // Script name or action identifier
  alarm_after_n_failure: number;
  reset_after_m_ok: number;

  // Maintenance
  maintenance_windows?: MaintenanceWindow[];

  docker_config?: {
    connection_type: 'local' | 'remote' | 'tcp';

    // SSH connection (for remote)
    ssh_host?: string;
    ssh_port?: number;
    ssh_username?: string;
    ssh_password?: string;
    ssh_private_key?: string;
    ssh_passphrase?: string;

    // TCP connection
    docker_host?: string;
    docker_port?: number;
    docker_tls?: boolean;
    docker_cert_path?: string;

    // Container selection
    container_name?: string;
    container_id?: string;
    image_name?: string;

    // Monitoring options
    check_status?: boolean;
    check_health?: boolean;
    check_restart_count?: boolean;
    check_cpu?: boolean;
    check_memory?: boolean;
    check_disk?: boolean;
    check_network?: boolean;

    // Thresholds
    max_restart_count?: number;
    cpu_warning?: number;
    cpu_critical?: number;
    memory_warning?: number;
    memory_critical?: number;
    disk_warning?: number;
    disk_critical?: number;
  }

  // Status
  active_disable: boolean;  // true = active, false = disabled
  running_stopped: boolean;  // true = running, false = stopped

  // System fields
  last_check?: Date;
  last_status?: 'ok' | 'warning' | 'alarm';
  updated_at?: Date;
}

alarming_candidate: Array<string | {
  name: string;
  email: string;
  mobile?: string;
  role?: string;
  // NEW: Notification preferences
  notification_preferences?: {
    warning: ('email' | 'sms' | 'call' | 'slack' | 'webhook')[];  // For warnings
    alarm: ('email' | 'sms' | 'call' | 'slack' | 'webhook')[];    // For alarms
  };
}>;

export interface AlarmingContact {
  name: string;
  email: string;
  mobile?: string;
  role?: string; // e.g., "Primary", "Secondary", "On-Call"
}
export interface MaintenanceWindow {
  start_date_time: Date;
  end_date_time: Date;
  description?: string;
  created_by: string;
}
export interface CertificateConfig {
  hostname: string;
  port?: number;
  timeout?: number;
  warning_threshold_days?: number;
  alarm_threshold_days?: number;
  check_chain?: boolean;
}
export interface SshConfig {
  host: string;
  port?: number;
  username: string;
  password?: string;
  private_key?: string;
  command: string;  // Command or script path to execute
}

export interface GcpConfig {
  project_id: string;
  resource_type: string;
  resource_id: string;
  region?: string;
  credentials_path: string;
}

export interface AzureConfig {
  subscription_id: string;
  resource_group: string;
  resource_type: string;
  resource_name: string;
  tenant_id: string;
  client_id: string;
  client_secret: string;
}

export interface AwsConfig {
  access_key_id: string;
  secret_access_key: string;
  region: string;
  service: string;
  resource_id: string;
  metric_name?: string;
}

export interface PingConfig {
  host?: string;
  count?: number;
  timeout?: number;
}

export interface LogConfig {
  log_path: string;
  is_remote: boolean;
  ssh_host?: string;
  ssh_username?: string;
  ssh_password?: string;
}

export interface AlertSettings {
  // Define alert settings properties here if needed
  [key: string]: any;
}

// Validation schema
export const MonitorValidation = {
  monitor_name: {
    required: true,
    minLength: 3,
    maxLength: 100
  },
  monitor_type: {
    required: true,
    enum: ['url', 'cpu', 'memory', 'system_availability', 'disk', 'custom', 'ssh', 'certificate', 'gcp', 'azure', 'aws', 'ping', 'log', 'api_post']
  },
  severity: {
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  period_in_minute: {
    required: true,
    min: 1,
    max: 1440  // Max 24 hours
  },
  timeout_in_second: {
    required: true,
    min: 5,
    max: 300  // Max 5 minutes
  },
  consecutive_warning: {
    required: true,
    min: 1,
    max: 10
  },
  consecutive_alarm: {
    required: true,
    min: 1,
    max: 10
  },
  alarm_after_n_failure: {
    required: true,
    min: 1,
    max: 20
  },
  reset_after_m_ok: {
    required: true,
    min: 1,
    max: 10
  }
};
export enum Collections {
  MONITORS = 'monitors',
  METRICS = 'metrics',
  MONITOR_STATES = 'monitor_states',
  ALERTS = 'alerts',  // Add this line
  ALERT_HISTORY = 'alert_history',  // Optional: for audit trail
  // ... any other collections you have
}
// Default values
export const MonitorDefaults: Partial<Monitor> = {
  consecutive_warning: 2,
  consecutive_alarm: 3,
  alarm_after_n_failure: 3,
  reset_after_m_ok: 2,
  period_in_minute: 5,
  timeout_in_second: 30,
  active_disable: true,
  running_stopped: true,
  severity: 'medium',
  dependencies: [],
  alarming_candidate: []
};

/**
 * Helper function to extract email addresses from alarming_candidate
 */
export function getAlarmingEmails(monitor: Monitor): string[] {
  if (!monitor.alarming_candidate || monitor.alarming_candidate.length === 0) {
    return [];
  }

  // Check if it's an array of strings (old format)
  if (typeof monitor.alarming_candidate[0] === 'string') {
    return monitor.alarming_candidate as string[];
  }

  // It's an array of AlarmingContact objects (new format)
  return (monitor.alarming_candidate as AlarmingContact[])
    .map(contact => contact.email)
    .filter(email => email && email.trim().length > 0);
}

/**
 * Helper function to extract mobile numbers from alarming_candidate
 */
export function getAlarmingMobiles(monitor: Monitor): string[] {
  if (!monitor.alarming_candidate || monitor.alarming_candidate.length === 0) {
    return [];
  }

  // Check if it's an array of strings (old format - no mobiles)
  if (typeof monitor.alarming_candidate[0] === 'string') {
    return [];
  }

  // It's an array of AlarmingContact objects (new format)
  return (monitor.alarming_candidate as AlarmingContact[])
    .map(contact => contact.mobile)
    .filter(mobile => mobile && mobile.trim().length > 0) as string[];
}