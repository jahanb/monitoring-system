// lib/models/MonitorState.ts
// Used for tracking consecutive failures/successes

export interface MonitorState {
  monitor_id: string;
  current_status: 'ok' | 'warning' | 'alarm' | 'error';
  consecutive_failures: number;
  consecutive_successes: number;
  last_check_time: Date;
  last_value: number | null;
  last_error?: string;
  
  // Current active alert
  active_alert_id?: string;
  
  // Recovery tracking
  recovery_in_progress: boolean;
  recovery_attempt_count: number;
  last_recovery_attempt?: Date;
  
  updated_at: Date;
}
