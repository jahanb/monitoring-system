// lib/models/Alert.ts - UPDATE THIS

import { ObjectId } from 'mongodb';

export interface Alert {
  _id?: ObjectId;
  monitor_id: string;
  monitor_name: string;
  alert_type?: 'warning' | 'alarm' | 'critical' | 'recovery';
  severity: 'low' | 'medium' | 'high' | 'critical' | 'alarm' | 'warning';  // Add 'alarm' and 'warning'
  message: string;
  value?: number;
  current_value?: number;
  threshold?: number;
  threshold_value?: number;  // Add this - your DB uses threshold_value
  consecutive_failures?: number;
  status: 'active' | 'acknowledged' | 'resolved' | 'auto_resolved' | 'in_recovery' | 'recovered';
  created_at?: Date;
  triggered_at: Date;
  updated_at?: Date;
  last_updated?: Date;  // Add this - your DB uses last_updated
  acknowledged_at?: Date;
  acknowledged_by?: string;
  acknowledgment_note?: string;  // Add this field
  resolved_at?: Date;
  recovered_at?: Date;  // Add this - your DB uses recovered_at
  resolved_by?: string;
  notification_sent?: boolean;
  notification_attempts?: number;
  notifications_sent?: Array<{
    type: string;
    channel?: string;  // Add channel field
    sent_at: Date;
    recipient?: string;
    success?: boolean;
    status?: string;  // Add status field
  }>;  // Add this - your DB has notifications_sent array
  last_notification_at?: Date;
  details?: any;
  metadata?: any;  // Add this - your DB has metadata
  recovery_sent?: boolean;
  recovery_attempts?: Array<any>;  // Add this - your DB has recovery_attempts
}

export interface RecoveryAttempt {
  _id?: ObjectId;
  alert_id: string;
  monitor_id: string;
  attempted_at: Date;
  success: boolean;
  action: string;
  result?: string;
  error?: string;
}

export interface NotificationLog {
  _id?: ObjectId;
  alert_id: string;
  monitor_id: string;
  channel?: string;  // Add this field
  recipient?: string;  // Add this field
  sent_at: Date;
  notification_type: 'email' | 'sms' | 'webhook' | 'slack';
  recipients: string[];
  success: boolean;
  status?: string;  // Add this field
  error?: string;
  response?: any;
}