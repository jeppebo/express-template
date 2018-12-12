// Express
import express from 'express';

// Middleware
import MobileDetect from 'mobile-detect';

// Error
import Boom from 'boom';
import ERR from '../error/errorCodes';

// Logging
import devLogger from '../modules/logging/devLogger';

// Util
import passport from '../modules/usermanagement/passport';
import permission from '../modules/usermanagement/permissions';
import authService from '../database/services/authService';
import redis from '../modules/redis/redis';
import awsEmail from '../modules/aws/email';
import validator from '../modules/security/validator';

const router = express.Router();

/**
 * @api {post} /register POST /register
 * @apiPermission none
 * @apiVersion 0.1.0
 * @apiName Register
 * @apiGroup Auth
 *
 * @apiHeader {String} x-csrf-token CSRF Token.
 *
 * @apiParam {String} email Email
 * @apiParam {String} username Username
 * @apiParam {String} password Password
 *
 * @apiSuccess {String} status OK
 *
 * @apiError (Server 5xx) 500/InternalServerError Something went wrong. / Email could not be sent.
 * @apiError (Client 4xx) 409/Conflict Email already exists.
 */
router.post('/register', (req, res, next) => {
    const data = validator.register(req.body);

    authService.addUser(data.username, data.email, data.password, data.role).then((user) => {
        const id = user._key;

        awsEmail.sendVerificationEmail(data.email, id, data.username).then((token) => {
            const key = redis.PREFIX.VERIFICATION_EMAIL + id;

            redis.setPair(key, token, 8 * 60 * 60);

            return res.json({ status: 'OK' });
        }).catch((error) => {
            next(error);
        });
    }).catch((error) => {
        next(error);
    });
});

/**
 * @api {post} /login POST /login
 * @apiPermission none
 * @apiVersion 0.1.0
 * @apiName Login
 * @apiGroup Auth
 *
 * @apiHeader {String} x-csrf-token CSRF Token.
 *
 * @apiParam {String} email Email
 * @apiParam {String} password Password
 *
 * @apiSuccess {String} status OK
 *
 * @apiError (Server 5xx) 500/InternalServerError Something went wrong.
 * @apiError (Client 4xx) 400/BadRequest Wrong email or password. / Please login with
 * google/facebook
 * @apiError (Client 4xx) 403/Forbidden Email is not verified.
 */
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (error, user) => {
        if (error) return next(error);

        req.logIn(user, (error) => {
            if (error) {
                return next(Boom.internal(error, {
                    response: ERR.MSG.DEFAULT,
                    type: ERR.TYPE.AUTH
                }));
            }

            // pass other properties from the session to the new one
            const passportInfo = req.session.passport;

            req.session.regenerate((error) => {
                if (error) {
                    return next(Boom.internal(error, {
                        response: ERR.MSG.DEFAULT,
                        type: ERR.TYPE.AUTH
                    }));
                }

                req.session.passport = passportInfo;
                return res.json({ status: 'OK' });
            });
        });
    })(req, res, next);
});

/**
 * @api {post} /logout POST /logout
 * @apiPermission user
 * @apiVersion 0.1.0
 * @apiName Logout
 * @apiGroup Auth
 *
 * @apiHeader {String} x-csrf-token CSRF Token.
 *
 * @apiSuccess {String} status OK
 *
 * @apiError (Client 4xx) 401/Unauthorized Please login first.
 */
router.post('/logout', permission.isLoggedIn, (req, res) => {
    req.logout();
    req.session.destroy();
    res.json({ status: 'OK' });
});

/**
 * @api {post} /updateEmail POST /updateEmail
 * @apiPermission user
 * @apiVersion 0.1.0
 * @apiName UpdateEmail
 * @apiGroup Auth
 *
 * @apiHeader {String} x-csrf-token CSRF Token.
 *
 * @apiParam {String} email Email
 *
 * @apiSuccess {String} status OK
 *
 * @apiError (Server 5xx) 500/InternalServerError Email could not be sent.
 * @apiError (Client 4xx) 400/BadRequest Email could not be found.
 * @apiError (Client 4xx) 401/Unauthorized Please login first.
 * @apiError (Client 4xx) 403/Forbidden You cannot change your email if you registered with
 * Google or Facebook.
 */
router.post('/updateEmail', permission.isLoggedIn, (req, res, next) => {
    const oldMail = validator.email(req.user.email);
    const newMail = validator.email(req.body.email);

    authService.changeEmail(oldMail, newMail).then((user) => {
        const { username } = user;
        const id = user._key;

        awsEmail.sendVerificationEmail(newMail, id, username).then((token) => {
            const key = redis.PREFIX.VERIFICATION_EMAIL + id;

            redis.setPair(key, token, 8 * 60 * 60);

            req.logout();
            req.session.destroy();
            res.json({ status: 'OK' });
        }).catch((error) => {
            next(error);
        });
    }).catch((error) => {
        next(error);
    });
});

/**
 * @api {post} /verifyEmail POST /verifyEmail
 * @apiPermission none
 * @apiVersion 0.1.0
 * @apiName SendVerifyEmail
 * @apiGroup Auth
 *
 * @apiHeader {String} x-csrf-token CSRF Token.
 *
 * @apiParam {String} email Email
 *
 * @apiSuccess {String} status OK
 *
 * @apiError (Server 5xx) 500/InternalServerError Email could not be sent.
 * @apiError (Client 4xx) 400/BadRequest Email could not be found.
 */
router.post('/verifyEmail', (req, res, next) => {
    const email = validator.email(req.body.email);

    authService.getUser(email).then((user) => {
        const { username } = user;
        const id = user._key;

        awsEmail.sendVerificationEmail(email, id, username).then((token) => {
            const key = redis.PREFIX.VERIFICATION_EMAIL + id;

            redis.setPair(key, token, 8 * 60 * 60);

            res.json({ status: 'OK' });
        }).catch((error) => {
            next(error);
        });
    }).catch((error) => {
        next(error);
    });
});

/**
 * @api {get} /verifyEmail/:username/:id/:token GET /verifyEmail/:username/:id/:token
 * @apiPermission none
 * @apiVersion 0.1.0
 * @apiName VerifyEmail
 * @apiGroup Auth
 *
 * @apiParam {String} username Username
 * @apiParam {String} id Id of the user
 * @apiParam {String} token Token associated with the user
 *
 * @apiSuccess {HTML} verified Webpage saying that the email is confirmed now.
 *
 * @apiError (Server 5xx) 500/InternalServerError Something went wrong.
 * @apiError (Client 4xx) 400/BadRequest Email could not be found.
 * @apiError (Client 4xx) 404/NotFound This link expired.
 */
router.get('/verifyEmail/:username/:id/:token', (req, res, next) => {
    const { username, id, token } = validator.redirectLink(req.params);
    const key = redis.PREFIX.VERIFICATION_EMAIL + id;

    redis.getValue(key).then((value) => {
        if (value !== token) {
            next(Boom.notFound('Email verification link expired', {
                response: ERR.MSG.LINK_EXPIRED,
                type: ERR.TYPE.AUTH,
                render: true
            }));
        } else {
            authService.verifyEmail(id).then(() => {
                redis.removePair(key);
                res.render('verified', { username });
            }).catch((error) => {
                next(error);
            });
        }
    });
});

/**
 * @api {post} /updatePassword POST /updatePassword
 * @apiPermission user
 * @apiVersion 0.1.0
 * @apiName UpdatePassword
 * @apiGroup Auth
 *
 * @apiHeader {String} x-csrf-token CSRF Token.
 *
 * @apiParam {String} password Password
 *
 * @apiSuccess {String} status OK
 *
 * @apiError (Server 5xx) 500/InternalServerError Something went wrong.
 * @apiError (Client 4xx) 401/Unauthorized Please login first.
 * @apiError (Client 4xx) 403/Forbidden You cannot change your password if you registered with
 * Google or Facebook.
 */
router.post('/updatePassword', permission.isLoggedIn, (req, res, next) => {
    const password = validator.password(req.body.password);
    const { id } = req.user;

    authService.changePassword(id, password).then(() => {
        req.logout();
        req.session.destroy();
        res.json({ status: 'OK' });
    }).catch((error) => {
        next(error);
    });
});

/**
 * @api {post} /resetPasswordLink POST /resetPasswordLink
 * @apiPermission none
 * @apiVersion 0.1.0
 * @apiName SendResetPasswordLink
 * @apiGroup Auth
 *
 * @apiHeader {String} x-csrf-token CSRF Token.
 *
 * @apiParam {String} email Email
 *
 * @apiSuccess {String} status OK
 *
 * @apiError (Server 5xx) 500/InternalServerError Something went wrong. / Email could not be sent.
 * @apiError (Client 4xx) 400/BadRequest Email could not be found.
 */
router.post('/resetPasswordLink', (req, res, next) => {
    const email = validator.email(req.body.email);

    authService.getUser(email).then((user) => {
        const { username } = user;
        const id = user._key;

        awsEmail.sendResetPasswordEmail(email, id, username).then((token) => {
            const key = redis.PREFIX.RESET_PASSWORD + id;

            redis.setPair(key, token, 8 * 60 * 60);

            res.json({ status: 'OK' });
        }).catch((error) => {
            next(error);
        });
    }).catch((error) => {
        next(error);
    });
});

/**
 * @api {get} /resetPassword/:username/:id/:token GET /resetPassword/:username/:id/:token
 * @apiPermission none
 * @apiVersion 0.1.0
 * @apiName SendResetPasswordForm
 * @apiGroup Auth
 *
 * @apiParam {String} username Username
 * @apiParam {String} id Id of the user
 * @apiParam {String} token Token associated with the user
 *
 * @apiSuccess {HTML} resetPassword Webpage showing a form for resetting the password.
 *
 * @apiError (Server 5xx) 500/InternalServerError Something went wrong.
 * @apiError (Client 4xx) 404/NotFound This link expired.
 */
router.get('/resetPassword/:username/:id/:token', (req, res, next) => {
    const { username, id, token } = validator.redirectLink(req.params);
    const key = redis.PREFIX.RESET_PASSWORD + id;

    redis.getValue(key).then((value) => {
        if (value !== token) {
            next(Boom.notFound('Password reset link expired', {
                response: ERR.MSG.LINK_EXPIRED,
                type: ERR.TYPE.AUTH,
                render: true
            }));
        } else {
            redis.removePair(key);
            req.session.reset = id;
            res.render('resetPassword', { username, csrfToken: res.locals.csrfToken });
        }
    });
});

/**
 * @api {post} /resetPassword POST /resetPassword
 * @apiPermission none
 * @apiVersion 0.1.0
 * @apiName ResetPassword
 * @apiGroup Auth
 *
 * @apiHeader {String} x-csrf-token CSRF Token.
 *
 * @apiParam {String} password Password
 * @apiParam {String} confirmPassword Confirmation of the password.
 *
 * @apiSuccess {HTML} success Webpage showing a success message.
 *
 * @apiError (Server 5xx) 500/InternalServerError Something went wrong.
 * @apiError (Client 4xx) 400/BadRequest Email could not be found.
 * @apiError (Client 4xx) 403/Forbidden You cannot change your password if you registered with
 * Google or Facebook.
 * @apiError (Client 4xx) 404/NotFound This link expired.
 */
router.post('/resetPassword', (req, res, next) => {
    if (req.session.reset) {
        const password = validator.password(req.body.password);
        const confirmPassword = validator.password(req.body.confirmPassword);

        if (password !== confirmPassword) {
            next(Boom.badData('Passwords do not match', {
                response: `Passwords ${ERR.MSG.NO_MATCH}`,
                type: ERR.TYPE.AUTH,
                render: true
            }));
        }

        const id = req.session.reset;

        authService.changePassword(id, password).then(() => {
            req.session.destroy();
            res.render('success');
        }).catch((error) => {
            next(error);
        });
    } else {
        next(Boom.notFound('Password reset not set for user', {
            response: ERR.MSG.LINK_EXPIRED,
            type: ERR.TYPE.AUTH,
            render: true
        }));
    }
});

/**
 * @api {post} /delete POST /delete
 * @apiPermission user
 * @apiVersion 0.1.0
 * @apiName Delete
 * @apiGroup Auth
 *
 * @apiHeader {String} x-csrf-token CSRF Token.
 *
 * @apiSuccess {String} status OK
 *
 * @apiError (Server 5xx) 500/InternalServerError Something went wrong.
 * @apiError (Client 4xx) 401/Unauthorized Please login first.
 */
router.post('/delete', permission.isLoggedIn, (req, res, next) => {
    authService.deleteUser(req.user.id).then(() => {
        req.logout();
        req.session.destroy();
        res.json({ status: 'OK' });
    }).catch((error) => {
        next(error);
    });
});

/**
 * @api {get} /facebook GET /facebook
 * @apiPermission none
 * @apiVersion 0.1.0
 * @apiName FacebookLogin
 * @apiGroup Auth
 *
 * @apiSuccess {HTML} redirect Redirect to Facebook login page.
 *
 * @apiError (Server 5xx) 500/InternalServerError Something went wrong.
 */
router.get('/facebook', passport.authenticate('facebook'));

/**
 * @api {get} /facebook/callback GET /facebook/callback
 * @apiPermission none
 * @apiVersion 0.1.0
 * @apiName FacebookCallback
 * @apiGroup Auth
 *
 * @apiSuccess {HTML} redirect Redirect to the homepage.
 *
 * @apiError (Server 5xx) 500/InternalServerError Something went wrong.
 * @apiError (Client 4xx) 409/Conflict Email already exists.
 */
router.get('/facebook/callback', (req, res, next) => {
    passport.authenticate('facebook', (error, user) => {
        if (error) {
            return next(Boom.internal(error, {
                response: error.data.response,
                type: error.data.type,
                render: true
            }));
        }

        req.logIn(user, (error) => {
            if (error) {
                return next(Boom.internal(error, {
                    response: ERR.MSG.DEFAULT,
                    type: ERR.TYPE.AUTH,
                    render: true
                }));
            }

            // pass other properties from the session to the new one
            const passportInfo = req.session.passport;
            req.session.regenerate((error) => {
                if (error) {
                    return next(Boom.internal(error, {
                        response: ERR.MSG.DEFAULT,
                        type: ERR.TYPE.AUTH,
                        render: true
                    }));
                }

                req.session.passport = passportInfo;

                const md = new MobileDetect(req.headers['user-agent']);
                if (md.mobile()) {
                    res.redirect(`OAuthLogin://login?user=${JSON.stringify(req.user)}`);
                } else {
                    res.redirect('/');
                }
            });
        });
    })(req, res, next);
});

/**
 * @api {get} /google GET /google
 * @apiPermission none
 * @apiVersion 0.1.0
 * @apiName GoogleLogin
 * @apiGroup Auth
 *
 * @apiSuccess {HTML} redirect Redirect to Google login page.
 *
 * @apiError (Server 5xx) 500/InternalServerError Something went wrong.
 */
router.get('/google', passport.authenticate('google', {
    scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
    ]
}));

/**
 * @api {get} /google/callback GET /google/callback
 * @apiPermission none
 * @apiVersion 0.1.0
 * @apiName GoogleCallback
 * @apiGroup Auth
 *
 * @apiSuccess {HTML} redirect Redirect to the homepage.
 *
 * @apiError (Server 5xx) 500/InternalServerError Something went wrong.
 * @apiError (Client 4xx) 409/Conflict Email already exists.
 */
router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', (error, user) => {
        if (error) {
            return next(Boom.internal(error, {
                response: error.data.response,
                type: error.data.type,
                render: true
            }));
        }

        req.logIn(user, (error) => {
            if (error) {
                return next(Boom.internal(error, {
                    response: ERR.MSG.DEFAULT,
                    type: ERR.TYPE.AUTH,
                    render: true
                }));
            }

            // pass other properties from the session to the new one
            const passportInfo = req.session.passport;
            req.session.regenerate((error) => {
                if (error) {
                    return next(Boom.internal(error, {
                        response: ERR.MSG.DEFAULT,
                        type: ERR.TYPE.AUTH,
                        render: true
                    }));
                }

                req.session.passport = passportInfo;

                const md = new MobileDetect(req.headers['user-agent']);
                if (md.mobile()) {
                    res.redirect(`OAuthLogin://login?user=${JSON.stringify(req.user)}`);
                } else {
                    res.redirect('/');
                }
            });
        });
    })(req, res, next);
});

module.exports = router;