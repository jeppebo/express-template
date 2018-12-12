import winston from 'winston';

const actions = {
    CREATE: 'created account.',
    LOGIN: 'logged in.',
    LOGOUT: 'logged out.',
    REGISTER: 'registered.',
    PASSWORD_CHANGE: 'changed password.',
    PASSWORD_RESET: 'reset password.',
    EMAIL_CHANGE: 'changed email.',
    EMAIL_VERIFIED: 'verified email.',
    DELETE: 'deleted account.'
};

function formatter(options) {
    const timestamp = new Date().toLocaleString();
    const level = winston.config.colorize(options.level, options.level.toUpperCase());

    return `${timestamp} AUTH ${level} ${options.message}`;
}

const logger = new winston.Logger({
    levels: winston.config.syslog.levels,
    colors: winston.config.syslog.colors
});

logger.configure({
    transports: [
        new winston.transports.Console({
            level: 'debug',
            colorize: true,
            formatter
        })
    ]
});

export default {
    actions,
    debug(action, user) {
        logger.debug(`${user.email} ${action}`);
    },
    info(action, user) {
        logger.info(`${user.email} ${action}`);
    },
    error(action, user, error) {
        const email = user.email || user;
        logger.error(`${email} ${action} ERROR: ${error.message}`);
    }
};
