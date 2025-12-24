import axios from 'axios';
import Logger from '../config/logger';
import { ContactRepository, Contact } from '../repositories/contact.repository';
import { GroupRepository, Group } from '../repositories/group.repository';
import { SyncStatusRepository } from '../repositories/syncStatus.repository';
import moment from 'moment-timezone';

export interface SyncResult {
    userId: string;
    contactsCount: number;
    groupsCount: number;
    duration: number;
    error?: string;
}

export class SyncService {
    private contactRepository: ContactRepository;
    private groupRepository: GroupRepository;
    private syncStatusRepository: SyncStatusRepository;
    private whatsappApiUrl: string;
    private whatsappApiKey: string;

    constructor() {
        this.contactRepository = new ContactRepository();
        this.groupRepository = new GroupRepository();
        this.syncStatusRepository = new SyncStatusRepository();
        this.whatsappApiUrl = process.env.WHATSAPP_API_URL || 'http://evolution-api:8080';
        this.whatsappApiKey = process.env.WHATSAPP_API_KEY || '';
    }

    async syncUser(userId: string, sessionPhone: string): Promise<SyncResult> {
        const startTime = Date.now();
        Logger.info(`[SYNC] Starting sync for user ${userId}`);

        try {
            // Mark sync as in progress
            await this.syncStatusRepository.upsert(userId, sessionPhone, {
                isSyncing: true,
                error: null
            });

            // Check if WhatsApp instance is connected
            const isConnected = await this.checkInstanceConnection(userId);
            if (!isConnected) {
                throw new Error('WhatsApp instance not connected');
            }

            // Sync contacts
            const contactsCount = await this.syncContacts(userId, sessionPhone);
            Logger.info(`[SYNC] Synced ${contactsCount} contacts for ${userId}`);

            // Sync groups
            const groupsCount = await this.syncGroups(userId, sessionPhone);
            Logger.info(`[SYNC] Synced ${groupsCount} groups for ${userId}`);

            const duration = Math.round((Date.now() - startTime) / 1000);

            // Update sync status
            await this.syncStatusRepository.upsert(userId, sessionPhone, {
                isSyncing: false,
                lastSync: moment.tz('America/Santiago').format(),
                totalContacts: contactsCount,
                totalGroups: groupsCount,
                error: null
            });

            Logger.info(`[SYNC] Completed sync for ${userId} in ${duration}s`);

            return { userId, contactsCount, groupsCount, duration };

        } catch (error: any) {
            const duration = Math.round((Date.now() - startTime) / 1000);
            Logger.error(`[SYNC] Failed sync for ${userId}: ${error.message}`);

            await this.syncStatusRepository.upsert(userId, sessionPhone, {
                isSyncing: false,
                error: error.message
            });

            return { userId, contactsCount: 0, groupsCount: 0, duration, error: error.message };
        }
    }

    private async checkInstanceConnection(instanceName: string): Promise<boolean> {
        try {
            const response = await axios.get(
                `${this.whatsappApiUrl}/instance/connectionState/${instanceName}`,
                { headers: { apikey: this.whatsappApiKey } }
            );
            const state = response.data?.instance?.state?.toLowerCase();
            return state === 'open' || state === 'connected';
        } catch (error) {
            Logger.error(`[SYNC] Failed to check connection for ${instanceName}`);
            return false;
        }
    }

    private async syncContacts(userId: string, sessionPhone: string): Promise<number> {
        try {
            const response = await axios.post(
                `${this.whatsappApiUrl}/chat/findContacts/${userId}`,
                {},
                { headers: { apikey: this.whatsappApiKey } }
            );

            const contacts = response.data || [];
            if (contacts.length === 0) {
                Logger.warn(`[SYNC] No contacts found for ${userId}`);
                return 0;
            }

            const contactsData: Omit<Contact, '_id'>[] = contacts
                .filter((c: any) => !c.isGroup && c.remoteJid)
                .map((c: any) => ({
                    userId,
                    sessionPhone,
                    phoneNumber: c.remoteJid.split('@')[0],
                    wid: c.id,
                    name: c.name || c.pushName || '',
                    profilePic: c.profilePicUrl || null,
                    isBusiness: c.isBusiness || false
                }));

            return await this.contactRepository.upsertMany(contactsData);
        } catch (error: any) {
            Logger.error(`[SYNC] Error syncing contacts: ${error.message}`);
            throw error;
        }
    }

    private async syncGroups(userId: string, sessionPhone: string): Promise<number> {
        try {
            const response = await axios.get(
                `${this.whatsappApiUrl}/group/fetchAllGroups/${userId}?getParticipants=false`,
                { headers: { apikey: this.whatsappApiKey } }
            );

            const groups = response.data || [];
            if (groups.length === 0) {
                Logger.warn(`[SYNC] No groups found for ${userId}`);
                return 0;
            }

            const groupsData: Omit<Group, '_id'>[] = groups
                .filter((g: any) => g.id && g.id.endsWith('@g.us'))
                .map((g: any) => ({
                    userId,
                    sessionPhone,
                    groupId: g.id,
                    name: g.subject || 'Unknown Group',
                    participants: g.size || 0
                }));

            return await this.groupRepository.upsertMany(groupsData);
        } catch (error: any) {
            Logger.error(`[SYNC] Error syncing groups: ${error.message}`);
            throw error;
        }
    }
}
