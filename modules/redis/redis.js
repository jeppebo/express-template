import redis from 'redis';

// Error
import Boom from 'boom';
import ERR from '../../error/errorCodes';

// Logging
import devLogger from '../logging/devLogger';

const PREFIX = {
    VERIFICATION_EMAIL: 'veem:',
    RESET_PASSWORD: 'repw:'
};

const client = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
});

client.on('error', (error) => {
    devLogger.alert(Boom.internal(error, {
        response: ERR.MSG.DEFAULT,
        type: ERR.TYPE.SERVER,
        host: process.env.REDIS_HOST
    }));
});

client.on('reconnecting', () => {
    devLogger.info('Redis reconnecting.', { host: process.env.REDIS_HOST });
});

client.on('connect', () => {
    devLogger.info('Redis connected.', { host: process.env.REDIS_HOST });
});

client.on('end', () => {
    devLogger.info('Redis disconnected.', { host: process.env.REDIS_HOST });
});

/**
 * Gets the redis client instance responsible for communicating with the
 * in-memory store.
 *
 * @returns {object} Redis client instance
 */
function getClient() {
    return client;
}

/**
 * Adds a new key-value pair to the in-memory database.
 *
 * @param {string} key The key to add.
 * @param {string} value The associated value to the key.
 * @param {number} expires The number in milliseconds after which the key-value pair expires.
 *
 * @returns {Promise} Returns a promise which resolves the resulting hash.
 *
 * @throws {InternalServerError} Will throw an error if there is something wrong with Redis.
 */
function setPair(key, value, expires) {
    client.set(key, value, (error, reply) => {
        if (error) {
            throw Boom.internal(error, {
                response: ERR.MSG.DEFAULT,
                type: ERR.TYPE.SERVER,
                host: process.env.REDIS_HOST
            });
        }

        if (expires) {
            client.expire(key, expires);
        }
    });
}

/**
 * Gets the value to an associated key in the in-memory store.
 *
 * @param {string} key The key to search for.
 *
 * @returns {Promise} Returns a promise which resolves the value associated to the key.
 *
 * @throws {InternalServerError} Will throw an error if there is something wrong with Redis.
 */
function getValue(key) {
    return new Promise((resolve, reject) => {
        client.get(key, (error, value) => {
            if (error) {
                reject(Boom.internal(error, {
                    response: ERR.MSG.DEFAULT,
                    type: ERR.TYPE.SERVER,
                    host: process.env.REDIS_HOST
                }));
            }

            resolve(value);
        });
    });
}

/**
 * Removes a key-value pair from the in-memory database.
 *
 * @param {string} key The key to remove.
 *
 * @throws {InternalServerError} Will throw an error if there is something wrong with Redis.
 */
function removePair(key) {
    client.del(key, (error, reply) => {
        if (error) {
            throw Boom.internal(error, {
                response: ERR.MSG.DEFAULT,
                type: ERR.TYPE.SERVER,
                host: process.env.REDIS_HOST
            });
        }
    });
}

const mRedis = {
    PREFIX,

    getClient,
    setPair,
    getValue,
    removePair
}

export default mRedis;
