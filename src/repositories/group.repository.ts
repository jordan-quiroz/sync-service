import { BaseRepository } from './base.repository';
import moment from 'moment-timezone';

export interface GroupParticipant {
    phone: string;
    isAdmin: boolean;
}

export interface Group {
    _id?: string;
    userId: string;
    sessionPhone: string;
    groupId: string;
    name: string;
    participants?: number;
    participantsList?: GroupParticipant[];
    createdAt?: string;
    updatedAt?: string;
}

export class GroupRepository extends BaseRepository<Group> {
    constructor() {
        super('groups');
    }

    async upsertMany(groups: Omit<Group, '_id'>[]): Promise<number> {
        if (groups.length === 0) return 0;

        const collection = await this.getCollection();
        const now = moment.tz('America/Santiago').format();

        const operations = groups.map(group => ({
            updateOne: {
                filter: {
                    userId: group.userId,
                    groupId: group.groupId
                },
                update: {
                    $set: {
                        ...group,
                        updatedAt: now
                    },
                    $setOnInsert: {
                        createdAt: now
                    }
                },
                upsert: true
            }
        }));

        const result = await collection.bulkWrite(operations);
        return result.upsertedCount + result.modifiedCount;
    }
}
