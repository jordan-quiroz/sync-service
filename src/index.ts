import cron from 'node-cron';
import { Queue } from 'bullmq';
import { connectToDatabase, closeDatabase } from './config/database';
import { getRedisConfig, QUEUE_NAME } from './config/redis';
import { WhatsappSessionRepository } from './repositories/whatsappSession.repository';
import { SyncWorker } from './workers/sync.worker';
import Logger from './config/logger';

let syncQueue: Queue | null = null;
let syncWorker: SyncWorker | null = null;

async function scheduleAllUsersSyncJobs(): Promise<void> {
    Logger.info('[CRON] Starting nightly sync job scheduling');

    try {
        const sessionRepository = new WhatsappSessionRepository();
        const sessions = await sessionRepository.findAll();

        if (sessions.length === 0) {
            Logger.warn('[CRON] No WhatsApp sessions found');
            return;
        }

        Logger.info(`[CRON] Found ${sessions.length} users to sync`);

        for (let i = 0; i < sessions.length; i++) {
            const session = sessions[i];
            const delay = i * 60 * 1000; // 1 minute between users

            await syncQueue!.add(
                'sync-user',
                {
                    userId: session.userId,
                    sessionPhone: session.phoneNumber || ''
                },
                {
                    delay,
                    removeOnComplete: 20,
                    removeOnFail: 50,
                    attempts: 2,
                    backoff: {
                        type: 'fixed',
                        delay: 60000
                    }
                }
            );

            Logger.info(`[CRON] Queued sync for ${session.userId} (delay: ${delay}ms)`);
        }

        Logger.info(`[CRON] Scheduled ${sessions.length} sync jobs`);
    } catch (error: any) {
        Logger.error(`[CRON] Error scheduling sync jobs: ${error.message}`);
    }
}

async function main(): Promise<void> {
    Logger.info('========================================');
    Logger.info('   sync-service starting...');
    Logger.info('========================================');

    try {
        // Connect to MongoDB
        await connectToDatabase();

        // Initialize BullMQ queue
        const redisConfig = getRedisConfig();
        syncQueue = new Queue(QUEUE_NAME, { connection: redisConfig });
        Logger.info(`[QUEUE] Connected to Redis queue: ${QUEUE_NAME}`);

        // Start worker
        syncWorker = new SyncWorker();
        syncWorker.start();

        // Schedule cron job
        const cronTime = process.env.SYNC_CRON_TIME || '0 0 * * *';
        cron.schedule(cronTime, () => {
            Logger.info('[CRON] Cron triggered - scheduling sync jobs');
            scheduleAllUsersSyncJobs();
        });
        Logger.info(`[CRON] Scheduled nightly sync at: ${cronTime}`);

        // Handle graceful shutdown
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

        Logger.info('========================================');
        Logger.info('   sync-service ready!');
        Logger.info('========================================');

    } catch (error: any) {
        Logger.error(`Failed to start sync-service: ${error.message}`);
        process.exit(1);
    }
}

async function shutdown(): Promise<void> {
    Logger.info('Shutting down sync-service...');

    if (syncWorker) {
        await syncWorker.stop();
    }

    if (syncQueue) {
        await syncQueue.close();
    }

    await closeDatabase();

    Logger.info('sync-service stopped');
    process.exit(0);
}

main();
