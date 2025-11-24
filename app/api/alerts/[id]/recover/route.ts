// app/api/alerts/[id]/recover/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, Collections } from '@/lib/db/mongodb';
import { ObjectId } from 'mongodb';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    
    // Get the alert
    const alert = await db.collection(Collections.ALERTS).findOne({
      _id: new ObjectId(params.id)
    });
    
    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }
    
    // Get the monitor to find recovery action
    const monitor = await db.collection(Collections.MONITORS).findOne({
      _id: new ObjectId(alert.monitor_id)
    });
    
    if (!monitor || !monitor.recovery_action) {
      return NextResponse.json(
        { error: 'No recovery action defined for this monitor' },
        { status: 400 }
      );
    }
    
    // Create recovery attempt
    const attemptNumber = (alert.recovery_attempts?.length || 0) + 1;
    const recoveryAttempt = {
      attempt_number: attemptNumber,
      action: monitor.recovery_action,
      started_at: new Date(),
      status: 'running' as const
    };
    
    // Update alert status
    await db.collection(Collections.ALERTS).updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: { status: 'in_recovery' },
        $push: { recovery_attempts: recoveryAttempt }
      }
    );
    
    // Execute recovery action asynchronously
    executeRecoveryAction(params.id, attemptNumber, monitor.recovery_action);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Recovery action initiated',
      attempt_number: attemptNumber
    });
  } catch (error: any) {
    console.error('Failed to trigger recovery:', error);
    return NextResponse.json(
      { error: 'Failed to trigger recovery' },
      { status: 500 }
    );
  }
}

async function executeRecoveryAction(
  alertId: string,
  attemptNumber: number,
  action: string
) {
  const db = await getDatabase();
  
  try {
    console.log(`🔧 Executing recovery action: ${action}`);
    
    // Execute the recovery script/command
    const { stdout, stderr } = await execAsync(action, {
      timeout: 60000 // 1 minute timeout
    });
    
    // Update recovery attempt with success
    await db.collection(Collections.ALERTS).updateOne(
      { 
        _id: new ObjectId(alertId),
        'recovery_attempts.attempt_number': attemptNumber
      },
      {
        $set: {
          'recovery_attempts.$.status': 'success',
          'recovery_attempts.$.completed_at': new Date(),
          'recovery_attempts.$.logs': stdout || stderr
        }
      }
    );
    
    console.log(`✅ Recovery action completed successfully`);
    
  } catch (error: any) {
    console.error(`❌ Recovery action failed:`, error.message);
    
    // Update recovery attempt with failure
    await db.collection(Collections.ALERTS).updateOne(
      { 
        _id: new ObjectId(alertId),
        'recovery_attempts.attempt_number': attemptNumber
      },
      {
        $set: {
          'recovery_attempts.$.status': 'failed',
          'recovery_attempts.$.completed_at': new Date(),
          'recovery_attempts.$.error_message': error.message,
          'recovery_attempts.$.logs': error.stderr || error.stdout || ''
        }
      }
    );
  }
}