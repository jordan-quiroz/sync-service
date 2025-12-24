import winston from 'winston';
import moment from 'moment-timezone';

const Logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: () => moment.tz('America/Santiago').format('YYYY-MM-DD HH:mm:ss')
        }),
        winston.format.printf(({ level, message, timestamp }) => {
            return `${timestamp} [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console()
    ]
});

export default Logger;
