import crypto from 'crypto';
import util from 'util';

/**
 * Generates a random number to use as salt.
 *
 * @param {number} bytes The length of the salt value.
 *
 * @returns {Promise} Returns a promise which resolves a buffer representing the salt value.
 *
 * @throw {Error} Will throw an error if something goes wrong during the generation of random bytes.
 */
function createSalt(bytes) {
    return util.promisify(crypto.randomBytes)(bytes);
}

const mCrypto = {
    createSalt
};

export default mCrypto;