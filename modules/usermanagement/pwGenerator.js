// Crypto
import crypto from 'crypto';
import argon2 from 'argon2';
import phc from '@phc/format';

// Util
import util from 'util';
import mCrypto from '../util/crypto';

// Error
import Boom from 'boom';
import ERR from '../../error/errorCodes';

const SALT_LENGTH = 32;

const PBKDF2_CFG = {
    k: 32,
    i: 40000,
    a: 'sha256'
};

const ARGON2_CFG = {
    timeCost: 40,
    memoryCost: 128000,
    parallelism: 4
};

const ALGORITHM = {
    PBKDF2: 'pbkdf2',
    ARGON2: 'argon2i'
};

/**
 * Hashes the password with a salt value based on PBKDF2.
 *
 * @param {string} password The password to hash.
 * @param {string} salt The salt to use with the password.
 * @param {number} iterations The number of iterations the hash algorithm should run.
 * @param {number} keylength The key-length of the hash.
 * @param {string} algorithm The hash algorithm to use.
 *
 * @returns {Promise} Returns a promise which resolves the resulting hash.
 *
 * @throw {Error} Will throw an error if any of the input arguments specify invalid.
 */
function pbkdf2(password, salt, iterations, keylength, algorithm) {
    return util.promisify(crypto.pbkdf2)(password, salt, iterations, keylength, algorithm);
}

/**
 * Hashes the password with a salt value based on Argon2i.
 *
 * @param {string} password The password to hash.
 *
 * @returns {Promise} Returns a promise which resolves the resulting phc string.
 *
 * @throw {InternalServerError} Will throw an error if something goes wrong during the
 * generation of either the salt or argon2 hash.
 */
async function createArgon2(password) {
    try {
        const salt = await mCrypto.createSalt(SALT_LENGTH);

        const cfg = Object.assign({}, ARGON2_CFG, { salt });

        return argon2.hash(password, cfg);
    } catch (error) {
        throw Boom.internal(error, { response: ERR.MSG.DEFAULT, type: ERR.TYPE.AUTH });
    }
}

/**
 * Hashes the password with Argon2i and the options specified in the phc string and compares
 * the resulting hash with the hash in the phc string.
 *
 * @param {string} password The password to compare.
 * @param {string} dbPassword The config containing the algorithm, hash, salt and other parameters
 * as phc string.
 *
 * @returns {boolean} Returns true if the hashed password matches the hash of the specified phc
 * string, false if not.
 *
 * @throw {InternalServerError} Will throw an error if something goes wrong during the verification
 */
async function verifyArgon2(password, dbPassword) {
    try {
        return argon2.verify(dbPassword, password);
    } catch (error) {
        throw Boom.internal(error, { response: ERR.MSG.DEFAULT, type: ERR.TYPE.AUTH });
    }
}

/**
 * Hashes the password based on PBKDF2 with a salt value.
 *
 * @param {password} password The password to hash.
 *
 * @returns {Promise} Returns a promise which resolves the resulting phc string.
 *
 * @throw {InternalServerError} Will throw an error if something goes wrong during the
 * generation of the salt or pbkdf2 hash.
 */
async function createPBKDF2(password) {
    try {
        const salt = await mCrypto.createSalt(SALT_LENGTH);

        const iterations = parseInt(PBKDF2_CFG.i, 10);
        const keylength = parseInt(PBKDF2_CFG.k, 10);
        const algorithm = PBKDF2_CFG.a;

        const hash = await pbkdf2(password, salt, iterations, keylength, algorithm);

        const dbPassword = {
            id: ALGORITHM.PBKDF2,
            hash,
            salt,
            params: PBKDF2_CFG
        };

        return phc.serialize(dbPassword);
    } catch (error) {
        throw Boom.internal(error, { response: ERR.MSG.DEFAULT, type: ERR.TYPE.AUTH });
    }
}

/**
 * Hashes the password with PBKDF2 and the options specified in the config object and compares
 * the resulting hash with the hash in config.
 *
 * @param {password} password The password to compare.
 * @param {object} dbConfig The config containing the algorithm, hash, salt and other parameters as
 * object.
 *
 * @returns {Promise} Returns a promise which resolves true if the hashed password matches the
 * hash of the specified config object, false if not.
 *
 * @throw {InternalServerError} Will throw an error if something goes wrong during the
 * generation of the pbkdf2 hash.
 */
async function verifyPBKDF2(password, dbConfig) {
    try {
        const iterations = parseInt(dbConfig.params.i, 10);
        const keylength = parseInt(dbConfig.params.k, 10);
        const algorithm = dbConfig.params.a;

        const hash = pbkdf2(password, dbConfig.salt, iterations, keylength, algorithm);

        return hash.toString('base64') === dbConfig.hash.toString('base64');
    } catch (error) {
        throw Boom.internal(error, { response: ERR.MSG.DEFAULT, type: ERR.TYPE.AUTH });
    }
}

/**
 * Hashes the password based on the specified algorithm with a random salt value.
 *
 * @param {string} algorithm The hashing function to use.
 * @param {string} password The password to hash.
 *
 * @returns {Promise} Returns a string containing the algorithm, hash, salt and other used
 * parameters formatted as phc.
 *
 * @throw {InternalServerError} Will throw an error if the specified algorithm is not supported.
 */
function createHash(algorithm, password) {
    switch (algorithm) {
        case ALGORITHM.PBKDF2:
            return createPBKDF2(password);
        case ALGORITHM.ARGON2:
            return createArgon2(password);
        default:
            throw Boom.internal('Algorithm not found', {
                response: ERR.MSG.DEFAULT,
                type: ERR.TYPE.AUTH
            });
    }
}

/**
 * Hashes the password with the options specified in the phc string and compares the resulting
 * hash with the hash in
 * the phc string.
 *
 * @param {string} password The password to compare.
 * @param {string} dbPassword The config containing the algorithm, hash, salt and other parameters
 * formatted as phc string.
 *
 * @returns {Promise} Returns true if the hashed password matches the hash of the specified phc
 * string, false if not.
 *
 * @throw {InternalServerError} Will throw an error if the specified algorithm is not supported.
 */
function verify(password, dbPassword) {
    const dbConfig = phc.deserialize(dbPassword);

    switch (dbConfig.id) {
        case ALGORITHM.PBKDF2:
            return verifyPBKDF2(password, dbConfig);
        case ALGORITHM.ARGON2:
            return verifyArgon2(password, dbPassword);
        default:
            throw Boom.internal('Algorithm not found', {
                response: ERR.MSG.DEFAULT,
                type: ERR.TYPE.AUTH
            });
    }
}

const pwGenerator = {
    ALGORITHM,

    createHash,
    verify
};

export default pwGenerator;