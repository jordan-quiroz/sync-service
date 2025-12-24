import { Worker, Job } from 'bullmq';
import { getRedisConfig, QUEUE_NAME } from '../config/redis';
import { SyncService, SyncResult } from '../services/sync.service';
import Logger from '../config/logger';

export interface SyncJobData {
    userId: string;
    sessionPhone: string;
}

export class SyncWorker {
    private worker: Worker | null = null;
    private syncService: SyncService;

    constructor() {
        this.syncService = new SyncService();
    }

    start(): void {
        const redisConfig = getRedisConfig();

        this.worker = new Worker<SyncJobData, SyncResult>(
            QUEUE_NAME,
            async (job: Job<SyncJobData>) => {
                return await this.processJob(job);
            },
            {
                connection: redisConfig,
                concurrency: 1, // Process one at a time
                limiter: {
                    max: 1,
                    duration: 1000
                }
            }
        );

        this.worker.on('completed', (job, result) => {
            Logger.info(`[WORKER] Job ${job.id} completed: ${result.contactsCount} contacts, ${result.groupsCount} groups`);
        });

        this.worker.on('failed', (job, error) => {
            Logger.error(`[WORKER] Job ${job?.id} failed: ${error.message}`);
        });

        this.worker.on('error', (error) => {
            Logger.error(`[WORKER] Worker error: ${error.message}`);
        });

        Logger.info('[WORKER] Sync worker started');
    }

    private async processJob(job: Job<SyncJobData>): Promise<SyncResult> {
        const { userId, sessionPhone } = job.data;
        Logger.info(`[WORKER] Processing sync job for user ${userId}`);

        const result = await this.syncService.syncUser(userId, sessionPhone);
        return result;
    }

    async stop(): Promise<void> {
        if (this.worker) {
            await this.worker.close();
            Logger.info('[WORKER] Sync worker stopped');
        }
    }
}
