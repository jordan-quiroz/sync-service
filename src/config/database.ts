import { MongoClient, Db } from 'mongodb';
import Logger from './logger';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
    if (db) return db;

    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/extraerinfo';

    try {
        Logger.info('Connecting to MongoDB...');
        client = new MongoClient(uri);
        await client.connect();
        db = client.db();
        Logger.info('Connected to MongoDB successfully');
        return db;
    } catch (error) {
        Logger.error('Failed to connect to MongoDB:', error);
        throw error;
    }
}

export function getDatabase(): Db {
    if (!db) {
        throw new Error('Database not connected. Call connectToDatabase() first.');
    }
    return db;
}

export async function closeDatabase(): Promise<void> {
    if (client) {
        await client.close();
        client = null;
        db = null;
        Logger.info('MongoDB connection closed');
    }
}
