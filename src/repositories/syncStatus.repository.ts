import { BaseRepository } from './base.repository';
import moment from 'moment-timezone';

export interface SyncStatus {
    _id?: string;
    userId: string;
    sessionPhone: string;
    isSyncing: boolean;
    lastSync?: string | null;
    totalContacts?: number;
    totalGroups?: number;
    error?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export class SyncStatusRepository extends BaseRepository<SyncStatus> {
    constructor() {
        super('syncStatuses');
    }

    async upsert(userId: string, sessionPhone: string, data: Partial<SyncStatus>): Promise<void> {
        const collection = await this.getCollection();
        const now = moment.tz('America/Santiago').format();

        await collection.updateOne(
            { userId, sessionPhone },
            {
                $set: {
                    ...data,
                    updatedAt: now
                },
                $setOnInsert: {
                    userId,
                    sessionPhone,
                    createdAt: now
                }
            },
            { upsert: true }
        );
    }

    async findByUserIdAndSessionPhone(userId: string, sessionPhone: string): Promise<SyncStatus | null> {
        const collection = await this.getCollection();
        const status = await collection.findOne({ userId, sessionPhone });
        if (!status) return null;
        return {
            ...status,
            _id: status._id?.toString()
        };
    }
}
