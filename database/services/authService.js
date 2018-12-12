// Error
import Boom from 'boom';
import ERR from '../../error/errorCodes';

// Database
import userDB from '../interfaces/userDB';
import authDB from '../interfaces/authDB';

// Util
import pwGenerator from '../../modules/usermanagement/pwGenerator';
import devLogger from '../../modules/logging/devLogger';
import { ROLES } from '../../modules/usermanagement/config';

/**
 * Gets a user by his/her email.
 *
 * @param {string} email The email of the user.
 *
 * @returns {promise} Returns a promise which resolves to the user.
 *
 * @throws {InternalServerError} Will throw an error if something goes wrong while communicating
 * with the database.
 * @throws {NotFound} Will throw an error if the user does not exist.
 */
async function getUser(email) {
    const authUser = await authDB.getUserByEmail(email);

    if (!authUser) {
        throw Boom.notFound('User is null', {
            response: ERR.MSG.USER_NOT_FOUND,
            type: ERR.TYPE.AUTH
        });
    }

    return authUser;
}

/**
 * Adds a new user to the database.
 *
 * @param {string} username The username of the user.
 * @param {string} email The email of the user.
 * @param {string} password The password of the user.
 *
 * @returns {promise} Returns a promise which resolves to the user.
 *
 * @throws {InternalServerError} Will throw an error if something goes wrong while communicating
 * with the database.
 * @throws {Conflict} Will throw an error if the user already exists.
 */
async function addUser(username, email, password) {
    const dbPassword = await pwGenerator.createHash(pwGenerator.ALGORITHM.ARGON2, password);

    let authUser;
    let user;

    try {
        authUser = await authDB.addUser({
            email,
            username,
            password: dbPassword,
            type: 'local'
        });

        user = await userDB.addUser({
            _key: authUser._key,
            username
        });
    } catch (error) {
        throw Boom.conflict(error, {
            response: ERR.MSG.USER_EXISTS,
            type: ERR.TYPE.AUTH
        });
    }

    return user;
}

/**
 * Adds a new user to the database.
 *
 * @param {string} platform The social media login the user chose.
 * @param {string} username The username of the user.
 * @param {string} email The email of the user.
 *
 * @returns {promise} Returns a promise which resolves to the user.
 *
 * @throws {InternalServerError} Will throw an error if something goes wrong while communicating
 * with the database.
 * @throws {Conflict} Will throw an error if the user already exists.
 */
async function addSocialUser(platform, username, email) {
    let authUser;
    let user;

    try {
        authUser = await authDB.addUser({
            email,
            username,
            password: null,
            type: platform
        });

        user = await userDB.addUser({
            _key: authUser._key,
            username
        });
    } catch (error) {
        throw Boom.conflict(error, {
            response: ERR.MSG.USER_EXISTS,
            type: ERR.TYPE.AUTH
        });
    }

    return user;
}

/**
 * Checks if the user is trying to login with the correct username and password.
 *
 * @param {string} email The email of the user.
 * @param {string} password The password of the user.
 *
 * @returns {promise} Returns a promise which resolves to the user.
 *
 * @throws {InternalServerError} Will throw an error if something goes wrong while communicating
 * with the database.
 * @throws {Bad Request} Will throw an error if the user does not exists or if the user used
 * a social login.
 * @throws {Forbidden} Will throw an error if the user has not verified his/her email yet.
 */
async function verifyUser(email, password) {
    const authUser = await authDB.getUserByEmail(email);

    if (!authUser) {
        throw Boom.badRequest('User is null', {
            response: ERR.MSG.WRONG_CREDENTIALS,
            type: ERR.TYPE.AUTH
        });
    }

    if (authUser.type !== 'local') {
        throw Boom.badRequest('Not correct login type.', {
            response: `${ERR.MSG.USER_WRONG_TYPE} ${authUser.type}.`,
            type: ERR.TYPE.AUTH
        });
    }

    if (!authUser.email_verified) {
        throw Boom.forbidden('Email not confirmed', {
            response: ERR.MSG.EMAIL_NOT_VERIFIED,
            type: ERR.TYPE.AUTH
        });
    }

    const verified = await pwGenerator.verify(password, authUser.password);

    if (!verified) {
        throw Boom.badRequest('pwGenerator is wrong', {
            response: ERR.MSG.WRONG_CREDENTIALS,
            type: ERR.TYPE.AUTH
        });
    }

    return authUser;
}

/**
 * Checks if the user is trying to login with the social media platform he/she registered with.
 *
 * @param {string} platform The social media login the user chose.
 * @param {string} username The username of the user.
 * @param {string} email The email of the user.
 *
 * @returns {promise} Returns a promise which resolves to the user.
 *
 * @throws {InternalServerError} Will throw an error if something goes wrong while communicating
 * with the database.
 * @throws {Conflict} Will throw an error if the user chose the wrong login method.
 */
async function verifySocialUser(platform, username, email) {
    const authUser = await authDB.getUserByEmail(email);
    let user;

    if (authUser) {
        if (authUser.type === platform) {
            user = await userDB.getUserById(authUser._key);
        } else {
            throw Boom.conflict('User already exists', {
                response: ERR.MSG.USER_EXISTS,
                type: ERR.TYPE.AUTH
            });
        }
    } else {
        user = await addSocialUser(platform, username, email);
    }

    return user;
}

/**
 * Changes the password of a user.
 *
 * @param {string} id The id of the user.
 * @param {string} password The password of the user.
 *
 * @returns {promise} Returns a promise which resolves to the user.
 *
 * @throws {InternalServerError} Will throw an error if something goes wrong while communicating
 * with the database.
 * @throws {NotFound} Will throw an error if the user does not exist.
 * @throws {Forbidden} Will throw an error if the user tries to change his/her password even
 * though he/she registered with a social media platform.
 */
async function changePassword(id, password) {
    const authUser = await authDB.getUserById(id);

    if (!authUser) {
        throw Boom.notFound('User is null', {
            response: ERR.MSG.USER_NOT_FOUND,
            type: ERR.TYPE.AUTH
        });
    }

    if (authUser.type !== 'local') {
        throw Boom.forbidden('Social users cannot change their password.', {
            response: ERR.MSG.SOCIAL_USER_PASSWORD,
            type: ERR.TYPE.AUTH
        });
    }

    authUser.password = await pwGenerator.createHash(pwGenerator.ALGORITHM.ARGON2, password);

    await authDB.updateUser(authUser);
}

/**
 * Changes the email of a user.
 *
 * @param {string} newEmail The new email of the user.
 * @param {string} oldEmail The old email of the user.
 *
 * @returns {promise} Returns a promise which resolves to the user.
 *
 * @throws {InternalServerError} Will throw an error if something goes wrong while communicating
 * with the database.
 * @throws {NotFound} Will throw an error if the user does not exist.
 * @throws {Forbidden} Will throw an error if the user tries to change his/her password even
 * though he/she registered with a social media platform.
 */
async function changeEmail(oldEmail, newEmail) {
    const authUser = await authDB.getUserByEmail(oldEmail);

    if (!authUser) {
        throw Boom.notFound('User is null', {
            response: ERR.MSG.USER_NOT_FOUND,
            type: ERR.TYPE.AUTH
        });
    }

    if (authUser.type !== 'local') {
        throw Boom.forbidden('Social users cannot change their email.', {
            response: ERR.MSG.SOCIAL_USER_EMAIL,
            type: ERR.TYPE.AUTH
        });
    }

    authUser.email = newEmail;
    authUser.email_verified = false;

    await authDB.updateUser(authUser);

    return authUser;
}

/**
 * Marks the email of a user as verified.
 *
 * @param {string} id The id of the user.
 *
 * @returns {promise} Returns a promise which resolves to the user.
 *
 * @throws {InternalServerError} Will throw an error if something goes wrong while communicating
 * with the database.
 * @throws {NotFound} Will throw an error if the user does not exist.
 */
async function verifyEmail(id) {
    const authUser = await authDB.getUserById(id);

    if (!authUser) {
        throw Boom.notFound('User is null', {
            response: ERR.MSG.USER_NOT_FOUND,
            type: ERR.TYPE.AUTH
        });
    }

    authUser.email_verified = true;

    await authDB.updateUser(authUser);
}

/**
 * Deletes a user from the database.
 *
 * @param {string} id The id of the user.
 *
 * @throws {InternalServerError} Will throw an error if something goes wrong while communicating
 * with the database.
 */
async function deleteUser(id) {
    await authDB.removeUser(id);
    await userDB.removeUser(id);
}

const AuthService = {
    getUser,
    addUser,
    verifyUser,
    verifySocialUser,
    changePassword,
    changeEmail,
    verifyEmail,
    deleteUser
};

export default AuthService;