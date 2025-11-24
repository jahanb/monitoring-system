// lib/models/Monitor.ts
export interface Monitor {
  _id?: string;
  monitor_name: string;
  monitor_type: 'url' | 'cpu' | 'memory' | 'system_availability' | 'disk' | 'custom';
  creation_date_time: Date;
  created_by: string;
  business_owner: string;
  alarming_candidate: string[];  // Array of recipients
  dependencies: string[];  // Related systems/apps
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  monitor_instance: string;  // URL, system name, or app name
  ssh_config?: SshConfig;
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
  

  ping_config?: {
    host?: string;      // IP or hostname (optional if monitor_instance is used)
    count?: number;     // Number of packets (default: 4)
    timeout?: number;   // Timeout in seconds (default: 5)
  };
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
  
  // Status
  active_disable: boolean;  // true = active, false = disabled
  running_stopped: boolean;  // true = running, false = stopped
  
  // System fields
  last_check?: Date;
  last_status?: 'ok' | 'warning' | 'alarm';
  updated_at?: Date;
}

export interface MaintenanceWindow {
  start_date_time: Date;
  end_date_time: Date;
  description?: string;
  created_by: string;
}

export interface SshConfig {
  host: string;
  port?: number;
  username: string;
  password?: string;
  private_key?: string;
  command: string;  // Command or script path to execute
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
    enum: ['url', 'cpu', 'memory', 'system_availability', 'disk', 'custom']
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