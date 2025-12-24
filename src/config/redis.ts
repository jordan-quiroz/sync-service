import Logger from './logger';

export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    db?: number;
}

export function getRedisConfig(): RedisConfig {
    const config: RedisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
    };

    Logger.info(`Redis config: ${config.host}:${config.port}`);
    return config;
}

export const QUEUE_NAME = 'sync-contacts-groups';
