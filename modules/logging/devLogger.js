import winston from 'winston';

function formatter(options) {
    const timestamp = new Date().toLocaleString();
    const level = winston.config.colorize(options.level, options.level.toUpperCase());

    return `${timestamp} DEV ${level} ${options.message}`;
}

const logger = new winston.Logger({
    levels: winston.config.syslog.levels,
    colors: winston.config.syslog.colors
});

logger.configure({
    transports: [
        new winston.transports.Console({
            level: (process.env.NODE_ENV === 'production') ? 'info' : 'debug',
            colorize: true,
            formatter
        })
    ]
});

function infoLog(level, message, data) {
    if (data && typeof data === 'object') {
        logger.log(level, `${message} DATA: ${JSON.stringify(data)}`);
    } else if (typeof message === 'object') {
        logger.log(level, `${JSON.stringify(message)}`);
    } else {
        logger.log(level, `${message}`);
    }
}

function errorLog(level, error) {
    if (!error.isBoom) {
        logger.log(level, `STACK: ${error.stack}`);
    } else if (error.output.statusCode === 401) {
        logger.log(level, `TYPE: Authentication STACK: ${error.stack}`);
    } else {
        const { type, response, ...data } = error.data;
        logger.log(level, `TYPE: ${type} DATA: ${JSON.stringify(data)} STACK: ${error.stack}`);
    }
}

export default {
    debug(message, data) {
        infoLog('debug', message, data);
    },
    info(message, data) {
        infoLog('info', message, data);
    },
    notice(message, data) {
        infoLog('notice', message, data);
    },
    warning(message, data) {
        infoLog('warn', message, data);
    },
    error(error) {
        errorLog('error', error);
    },
    crit(error) {
        errorLog('crit', error);
    },
    alert(error) {
        errorLog('alert', error);
    }
};
