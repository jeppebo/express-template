import url from 'url';
import csurf from 'csurf';
import MobileDetect from 'mobile-detect';

// Error
import Boom from 'boom';
import ERR from '../../error/errorCodes';

// Logging
import devLogger from '../logging/devLogger';

const ignoreMethods = [
    'GET',
    'HEAD',
    'OPTIONS'
];

const csrfToken = csurf({
    value: (req) => {
        if (req.path === '/auth/resetPassword/') {
            return req.body._csrf;
        }

        return req.headers['x-csrf-token'];
    }
});

/**
 * Checks if the request (excluding GET, HEAD and OPTIONS) is coming from the same application.
 *
 * @returns {function} Returns a middleware function which will throw an error if the request is
 * not coming from the application.
 *
 * @throw {Unauthorized} Will throw an error if the headers of the request are not correct.
 * @throw {Error} Will throw an error if the csrf token is not matching.
 */
export default () => (req, res, next) => {
    if (ignoreMethods.indexOf(req.method) === -1) {
        const targetOrigin = req.headers['x-forwarded-host'] || req.headers.host;

        if (!targetOrigin) {
            next(Boom.unauthorized('Target origin is missing.', {
                response: ERR.MSG.UNAUTHORIZED,
                type: ERR.TYPE.SEC
            }));
        }

        const origin = (req.headers.origin) ? url.parse(req.headers.origin).host : '';
        const referer = (req.headers.referer) ? url.parse(req.headers.referer).host : '';
        const sourceOrigin = origin || referer;

        if (!sourceOrigin) {
            next(Boom.unauthorized('Source origin is missing.', {
                response: ERR.MSG.UNAUTHORIZED,
                type: ERR.TYPE.SEC
            }));
        }

        if (sourceOrigin !== targetOrigin) {
            next(Boom.unauthorized('Target and source origin not matching', {
                response: ERR.MSG.UNAUTHORIZED,
                type: ERR.TYPE.SEC
            }));
        }
    }

    const md = new MobileDetect(req.headers['user-agent']);

    if (!md.mobile()) {
        csrfToken(req, res, next);
    }
};