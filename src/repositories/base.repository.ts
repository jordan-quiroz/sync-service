import { Collection, Db, Document, ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import moment from 'moment-timezone';

export abstract class BaseRepository<T extends Document> {
    protected collectionName: string;

    constructor(collectionName: string) {
        this.collectionName = collectionName;
    }

    protected async getCollection(): Promise<Collection<T>> {
        const db = getDatabase();
        return db.collection<T>(this.collectionName);
    }

    async findById(id: string): Promise<T | null> {
        const collection = await this.getCollection();
        const objectId = ObjectId.isValid(id) ? new ObjectId(id) : null;
        if (!objectId) return null;
        return await collection.findOne({ _id: objectId } as any) as T | null;
    }

    async create(data: Omit<T, '_id'>): Promise<string> {
        const collection = await this.getCollection();
        const now = moment.tz('America/Santiago').format();
        const result = await collection.insertOne({
            ...data,
            createdAt: now,
            updatedAt: now
        } as any);
        return result.insertedId.toString();
    }

    async update(id: string, data: Partial<T>): Promise<void> {
        const collection = await this.getCollection();
        const objectId = ObjectId.isValid(id) ? new ObjectId(id) : null;
        if (!objectId) return;
        const now = moment.tz('America/Santiago').format();
        await collection.updateOne(
            { _id: objectId } as any,
            { $set: { ...data, updatedAt: now } }
        );
    }
}
