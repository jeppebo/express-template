import boom from 'boom';
import ERR from './errorCodes';

/**
 * Handles errors thrown in the code. Depending on the error type, it
 * either renders an error page or responds with an error message in json format.
 *
 * @returns {function} Returns a middleware function which will send an appropriate response
 * depending on the error type.
 */
export default () => (err, req, res, next) => {
    let error;

    /**
     * If there is an unexpected error, it will be wrapped inside a Boom error object.
     */
    if (!boom.isBoom(err)) {
        error = boom.badRequest(err, {
            response: ERR.MSG.DEFAULT
        });
    } else {
        error = err;
    }

    const statusCode = error.output.statusCode;
    let message;
    let render;

    /**
     * Because the structure of the unauthorized error in Boom is different from the others, the
     * information necessary for the response needs to be read from different object properties.
     */
    if (error.output.statusCode === 401) {
        message = ERR.MSG.UNAUTHORIZED;
        render = false;
    } else {
        message = error.data.response || ERR.MSG.DEFAULT;
        render = error.data.render;
    }

    /**
     * If the error results from a route which would usually render a page from the server, an error
     * page will be rendered instead of sending an error object in json. These mentioned routes
     * specify a render property on the error object to be able to distinguish that scenario.
     */
    if (render || req.path === '/auth/resetPassword/') {
        res.status(statusCode).render('error', { message });
    } else {
        res.status(statusCode).json({ error: error.output.payload.error, message });
    }
};