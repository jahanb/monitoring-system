// lib/db/mongodb.ts
import { MongoClient, Db, Collection } from 'mongodb';

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' });
}

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

// Collection names
export const Collections = {
  MONITORS: 'monitors',
  METRICS: 'metrics',
  ALERTS: 'alerts',
  MONITOR_STATES: 'monitor_states',
  NOTIFICATION_QUEUE: 'notification_queue',
  AUDIT_LOG: 'audit_log',
  ALERT_HISTORY: 'alert_history'
} as const;

// Get database instance
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB_NAME || 'monitoring_system');
}

// Get specific collection with type safety
export async function getCollection<T = any>(collectionName: string): Promise<Collection<T>> {
  const db = await getDatabase();
  return db.collection<T>(collectionName);
}

// Check database connection
export async function checkConnection(): Promise<boolean> {
  try {
    const client = await clientPromise;
    await client.db().admin().ping();
    return true;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    return false;
  }
}