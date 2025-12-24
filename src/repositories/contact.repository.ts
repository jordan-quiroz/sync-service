import { BaseRepository } from './base.repository';
import moment from 'moment-timezone';

export interface Contact {
    _id?: string;
    userId: string;
    sessionPhone: string;
    phoneNumber: string;
    wid?: string;
    name?: string;
    profilePic?: string | null;
    isBusiness?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export class ContactRepository extends BaseRepository<Contact> {
    constructor() {
        super('contacts');
    }

    async upsertMany(contacts: Omit<Contact, '_id'>[]): Promise<number> {
        if (contacts.length === 0) return 0;

        const collection = await this.getCollection();
        const now = moment.tz('America/Santiago').format();

        const operations = contacts.map(contact => ({
            updateOne: {
                filter: {
                    userId: contact.userId,
                    phoneNumber: contact.phoneNumber
                },
                update: {
                    $set: {
                        ...contact,
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
