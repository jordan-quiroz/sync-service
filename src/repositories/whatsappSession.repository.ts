import { BaseRepository } from './base.repository';

export interface WhatsappSession {
    _id?: string;
    userId: string;
    instanceId: string;
    phoneNumber?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
}

export class WhatsappSessionRepository extends BaseRepository<WhatsappSession> {
    constructor() {
        super('whatsappSessions');
    }

    async findAll(): Promise<WhatsappSession[]> {
        const collection = await this.getCollection();
        const sessions = await collection.find({}).toArray();
        return sessions.map(s => ({
            ...s,
            _id: s._id?.toString()
        }));
    }

    async findByUserId(userId: string): Promise<WhatsappSession | null> {
        const collection = await this.getCollection();
        const session = await collection.findOne({ userId });
        if (!session) return null;
        return {
            ...session,
            _id: session._id?.toString()
        };
    }
}
