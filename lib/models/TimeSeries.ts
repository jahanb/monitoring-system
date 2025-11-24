export interface MonitorMetric {
  _id?: string;
  monitor_id: string;
  timestamp: Date;
  value: number | null;
  status: 'ok' | 'warning' | 'alarm' | 'error';
  response_time?: number;  // in milliseconds
  status_code?: number;  // HTTP status code
  error_message?: string;
  metadata?: {
    cpu_usage?: number;
    memory_usage?: number;
    disk_usage?: number;
    response_body?: string;  // First 1000 chars
    pattern_match?: {
      positive: boolean;
      negative: boolean;
    };
  };
}

