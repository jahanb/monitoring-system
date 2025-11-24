// lib/models/Alert.ts

export interface Alert {
  _id?: string;
  monitor_id: string;
  monitor_name: string;
  severity: 'warning' | 'alarm';
  status: 'active' | 'recovered' | 'acknowledged' | 'in_recovery';
  
  triggered_at: Date;
  recovered_at?: Date;
  acknowledged_at?: Date;
  acknowledged_by?: string;
  
  // Alert details
  current_value: number;
  threshold_value: number;
  consecutive_failures: number;
  
  // Recovery tracking
  recovery_attempts: RecoveryAttempt[];
  
  // Notifications tracking
  notifications_sent: NotificationLog[];
  
  message: string;
  metadata?: any;
}

export interface RecoveryAttempt {
  attempt_number: number;
  action: string;
  started_at: Date;
  completed_at?: Date;
  status: 'running' | 'success' | 'failed';
  error_message?: string;
  logs?: string;
}

export interface NotificationLog {
  channel: 'email' | 'sms' | 'call' | 'webhook';
  recipient: string;
  sent_at: Date;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  message_id?: string;
}
