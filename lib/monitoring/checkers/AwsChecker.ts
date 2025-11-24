// lib/monitoring/checkers/AwsChecker.ts

import { Monitor } from '@/lib/models/Monitor';
import { IChecker, CheckResult, createErrorResult, determineStatus } from '../types';
import { 
  CloudWatchClient, 
  GetMetricStatisticsCommand,
  GetMetricStatisticsCommandInput 
} from '@aws-sdk/client-cloudwatch';
import { 
  EC2Client, 
  DescribeInstancesCommand,
  DescribeInstanceStatusCommand 
} from '@aws-sdk/client-ec2';

/**
 * AWS CloudWatch Checker
 * - Monitors EC2 instances
 * - Gets CPU, Memory, Network metrics from CloudWatch
 * - Checks instance status
 */
export class AwsChecker implements IChecker {
  readonly type = 'aws';

  async check(monitor: Monitor): Promise<CheckResult> {
    const startTime = Date.now();

    try {
      const awsConfig = this.parseAwsConfig(monitor);
      
      if (!awsConfig.valid) {
        return {
          success: false,
          value: null,
          status: 'error',
          message: awsConfig.error || 'Invalid AWS configuration',
          timestamp: new Date()
        };
      }

      console.log(`☁️ Checking AWS ${awsConfig.service}: ${awsConfig.resourceId}`);

      let metrics;
      switch (awsConfig.service) {
        case 'ec2':
          metrics = await this.checkEC2Instance(awsConfig);
          break;
        case 'rds':
          metrics = await this.checkRDSInstance(awsConfig);
          break;
        case 'lambda':
          metrics = await this.checkLambda(awsConfig);
          break;
        default:
          throw new Error(`Unsupported AWS service: ${awsConfig.service}`);
      }

      const responseTime = Date.now() - startTime;

      // Determine status based on primary metric
      const primaryValue = metrics.cpu || metrics.memory || metrics.statusCheckFailed || 0;
      
      const status = determineStatus(primaryValue, {
        lowWarning: monitor.low_value_threshold_warning,
        highWarning: monitor.high_value_threshold_warning,
        lowAlarm: monitor.low_value_threshold_alarm,
        highAlarm: monitor.high_value_threshold_alarm
      });

      return {
        success: true,
        value: primaryValue,
        status,
        message: `AWS check successful - ${this.formatMetrics(metrics)}`,
        responseTime,
        metadata: {
          service: awsConfig.service,
          resourceId: awsConfig.resourceId,
          region: awsConfig.region,
          metrics
        },
        timestamp: new Date()
      };

    } catch (error: any) {
      console.error('❌ AWS Check Failed:', error.message);
      return createErrorResult(error, Date.now() - startTime);
    }
  }

  validate(monitor: Monitor): boolean | string {
    const aws = (monitor as any).aws_config;
    
    if (!aws) return 'AWS configuration is required';
    if (!aws.access_key_id) return 'AWS Access Key ID is required';
    if (!aws.secret_access_key) return 'AWS Secret Access Key is required';
    if (!aws.region) return 'AWS Region is required';
    if (!aws.service) return 'AWS Service is required';
    if (!aws.resource_id) return 'Resource ID is required';
    
    return true;
  }

  private parseAwsConfig(monitor: Monitor) {
    const aws = (monitor as any).aws_config;

    if (!aws) {
    return { valid: false, error: 'AWS config missing', region: '', service: '', resourceId: '', accessKeyId: '', secretAccessKey: '' };
    }

    return {
      valid: true,
      region: aws.region,
      service: aws.service,
      resourceId: aws.resource_id,
      accessKeyId: aws.access_key_id,
      secretAccessKey: aws.secret_access_key,
      metricName: aws.metric_name || 'CPUUtilization'
    };
  }

  private async checkEC2Instance(config: any) {
    const ec2Client = new EC2Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });

    const cloudwatchClient = new CloudWatchClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });

    // Get instance status
    const statusCommand = new DescribeInstanceStatusCommand({
      InstanceIds: [config.resourceId]
    });

    const statusResponse = await ec2Client.send(statusCommand);
    const instanceStatus = statusResponse.InstanceStatuses?.[0];

    // Get CPU metrics from CloudWatch
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 5 * 60 * 1000); // Last 5 minutes

    const metricsCommand = new GetMetricStatisticsCommand({
      Namespace: 'AWS/EC2',
      MetricName: config.metricName,
      Dimensions: [{ Name: 'InstanceId', Value: config.resourceId }],
      StartTime: startTime,
      EndTime: endTime,
      Period: 300, // 5 minutes
      Statistics: ['Average']
    });

    const metricsResponse = await cloudwatchClient.send(metricsCommand);
    const datapoints = metricsResponse.Datapoints || [];
    
    const latestDatapoint = datapoints.sort((a, b) => 
      (b.Timestamp?.getTime() || 0) - (a.Timestamp?.getTime() || 0)
    )[0];

    return {
      cpu: latestDatapoint?.Average || 0,
      instanceState: instanceStatus?.InstanceState?.Name || 'unknown',
      systemStatus: instanceStatus?.SystemStatus?.Status || 'unknown',
      instanceStatus: instanceStatus?.InstanceStatus?.Status || 'unknown',
      statusCheckFailed: instanceStatus?.SystemStatus?.Status === 'ok' && 
                         instanceStatus?.InstanceStatus?.Status === 'ok' ? 0 : 1
    };
  }

  private async checkRDSInstance(config: any) {
    const cloudwatchClient = new CloudWatchClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 5 * 60 * 1000);

    const metricsCommand = new GetMetricStatisticsCommand({
      Namespace: 'AWS/RDS',
      MetricName: config.metricName,
      Dimensions: [{ Name: 'DBInstanceIdentifier', Value: config.resourceId }],
      StartTime: startTime,
      EndTime: endTime,
      Period: 300,
      Statistics: ['Average']
    });

    const metricsResponse = await cloudwatchClient.send(metricsCommand);
    const datapoints = metricsResponse.Datapoints || [];
    
    const latestDatapoint = datapoints.sort((a, b) => 
      (b.Timestamp?.getTime() || 0) - (a.Timestamp?.getTime() || 0)
    )[0];

    return {
      cpu: latestDatapoint?.Average || 0,
      value: latestDatapoint?.Average || 0
    };
  }

  private async checkLambda(config: any) {
    const cloudwatchClient = new CloudWatchClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 5 * 60 * 1000);

    const metricsCommand = new GetMetricStatisticsCommand({
      Namespace: 'AWS/Lambda',
      MetricName: config.metricName || 'Errors',
      Dimensions: [{ Name: 'FunctionName', Value: config.resourceId }],
      StartTime: startTime,
      EndTime: endTime,
      Period: 300,
      Statistics: ['Sum']
    });

    const metricsResponse = await cloudwatchClient.send(metricsCommand);
    const datapoints = metricsResponse.Datapoints || [];
    
    const latestDatapoint = datapoints.sort((a, b) => 
      (b.Timestamp?.getTime() || 0) - (a.Timestamp?.getTime() || 0)
    )[0];

    return {
      errors: latestDatapoint?.Sum || 0,
      value: latestDatapoint?.Sum || 0
    };
  }

  private formatMetrics(metrics: any): string {
    const parts = [];
    if (metrics.cpu !== undefined) parts.push(`CPU: ${metrics.cpu.toFixed(2)}%`);
    if (metrics.memory !== undefined) parts.push(`Memory: ${metrics.memory.toFixed(2)}%`);
    if (metrics.instanceState) parts.push(`State: ${metrics.instanceState}`);
    if (metrics.errors !== undefined) parts.push(`Errors: ${metrics.errors}`);
    return parts.length > 0 ? parts.join(', ') : 'Metrics retrieved';
  }
}