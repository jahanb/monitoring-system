// lib/db/mongodb.ts - FIX

import { MongoClient, Db, Collection, Document } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

const uri: string = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the client across module reloads
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

// Helper to get database
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB_NAME || 'monitoring');
}

// Collection names constant
export const Collections = {
  MONITORS: 'monitors',
  MONITOR_STATES: 'monitor_states',
  METRICS: 'metrics',
  ALERTS: 'alerts',
  ALERT_HISTORY: 'alert_history',
  LOGS: 'logs',
  USERS: 'users',
  SETTINGS: 'settings',
} as const;

// Get specific collection with type safety
// FIX: Add Document constraint
export async function getCollection<T extends Document = Document>(
  collectionName: string
): Promise<Collection<T>> {
  const db = await getDatabase();
  return db.collection<T>(collectionName);
}

// Close connection (useful for cleanup)
export async function closeConnection(): Promise<void> {
  const client = await clientPromise;
  await client.close();
}

// Check connection health
export async function checkConnection(): Promise<boolean> {
  try {
    const client = await clientPromise;
    await client.db().admin().ping();
    return true;
  } catch (error) {
    console.error('MongoDB connection check failed:', error);
    return false;
  }
}