// Error
import Boom from 'boom';
import ERR from '../../error/errorCodes';

// AWS
import AWS from './aws';

// Util
import mCrypto from '../util/crypto';

const SES = new AWS.SES({ apiVersion: '2010-12-01' });

const TYPE = {
    EMAIL_VERIFICATION: 'verifyEmailTemplate',
    RESET_PASSWORD: 'resetPasswordTemplate'
};

const config = {
    tokenLength: 20,
    app: '<APPNAME>',
    source: '<EMAILADDRESS>',
    baseURL: `${process.env.URL}/auth`
};

/**
 * Sends an email to the user with a link which verifies the user's email.
 *
 * @param {string} to The address to send the email to.
 * @param {string} id The id of the user.
 * @param {string} username The username of the user.
 *
 * @returns {promise} Returns a promise which resolves to the token that is sent with the email.
 *
 * @throws {InternalServerError} Will throw an error if something goes wrong while sending the
 * email.
 */
async function sendVerificationEmail(to, id, username) {
    try {
        const salt = await mCrypto.createSalt(config.tokenLength);
        const token = salt.toString('hex');

        const templatedData = {
            app: config.app,
            username,
            verify_url: `${config.baseURL}/verifyEmail/${username}/${id}/${token}`
        };

        const emailConfig = {
            Destination: {
                ToAddresses: [to]
            },
            Source: config.source,
            Template: TYPE.EMAIL_VERIFICATION,
            TemplateData: JSON.stringify(templatedData)
        };

        await SES.sendTemplatedEmail(emailConfig).promise();

        return token;
    } catch (error) {
        throw Boom.internal(error, { response: ERR.MSG.EMAIL_NOT_SENT, type: ERR.TYPE.SERVER });
    }
}

/**
 * Sends an email to the user with a link with which the user can reset his/her password.
 *
 * @param {string} to The address to send the email to.
 * @param {string} id The id of the user.
 * @param {string} username The username of the user.
 *
 * @returns {promise} Returns a promise which resolves to the token that is sent with the email.
 *
 * @throws {InternalServerError} Will throw an error if something goes wrong while sending the
 * email.
 */
async function sendResetPasswordEmail(to, id, username) {
    try {
        const salt = await mCrypto.createSalt(config.tokenLength);
        const token = salt.toString('hex');

        const templatedData = {
            app: config.app,
            username,
            verify_url: `${config.baseURL}/resetPassword/${username}/${id}/${token}`
        };

        const emailConfig = {
            Destination: {
                ToAddresses: [to]
            },
            Source: config.source,
            Template: TYPE.RESET_PASSWORD,
            TemplateData: JSON.stringify(templatedData)
        };

        await SES.sendTemplatedEmail(emailConfig).promise();

        return token;
    } catch (error) {
        throw Boom.internal(error, { response: ERR.MSG.EMAIL_NOT_SENT, type: ERR.TYPE.SERVER });
    }
}

const awsEmail = {
    sendVerificationEmail,
    sendResetPasswordEmail
};

export default awsEmail;