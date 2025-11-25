// app/api/alerts/debug/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, Collections } from '@/lib/db/mongodb';

/**
 * Debug endpoint to check alerts collection
 */
export async function GET(request: NextRequest) {
    try {
        const db = await getDatabase();

        // Check if Collections.ALERTS exists
        const collectionsEnum = Collections;
        const hasAlertsCollection = 'ALERTS' in Collections;

        // Try to query alerts
        let alerts: any[] = [];
        let error = null;

        try {
            alerts = await db.collection(Collections.ALERTS).find().limit(10).toArray();
        } catch (e: any) {
            error = e.message;
        }

        // Count alerts
        let alertCount = 0;
        try {
            alertCount = await db.collection(Collections.ALERTS).countDocuments();
        } catch (e: any) {
            error = error || e.message;
        }

        // Get collection names from database
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        return NextResponse.json({
            collections_enum: {
                has_ALERTS: hasAlertsCollection,
                ALERTS_value: hasAlertsCollection ? Collections.ALERTS : 'NOT DEFINED'
            },
            database: {
                actual_collections: collectionNames,
                has_alerts_collection: collectionNames.includes('alerts')
            },
            alerts: {
                count: alertCount,
                sample: alerts.slice(0, 3),
                error
            }
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message, stack: error.stack },
            { status: 500 }
        );
    }
}