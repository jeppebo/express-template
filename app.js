// Express
import express from 'express';

// Config
import dotenv from 'dotenv/config';

// Middleware
import path from 'path';
import session from 'express-session';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import connectRedis from 'connect-redis';

// Routes
import UserController from './routes/UserController';
import AuthController from './routes/AuthController';

// Error
import errorHandler from './error/errorHandler';

// Util
import passport from './modules/usermanagement/passport';
import redis from './modules/redis/redis';
import csrf from './modules/security/csrf';

// Logging
import devLogger from './modules/logging/devLogger';

const app = express();
const RedisStore = connectRedis(session);

/**
 * MIDDLEWARE
 */

// Headers
app.disable('x-powered-by'); // hides the powered-by header

app.use(helmet.frameguard({ action: 'deny' })); // does not allow sites to embed this page as iframe
app.use(helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true
})); // forces browser to use https
app.use(helmet.noCache()); // do not cache responses (use individually for routes)
app.use(helmet.noSniff()); // does not allow browsers to decide the content-type
app.use(helmet.xssFilter()); // enables browsers' xss filter
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"]
    }
})); // only allows resources to be loaded from the same domain
app.use(helmet.ieNoOpen()); // prevents IE from executing downloads in the site's context

// Static client
if (['devb', 'test'].includes(process.env.NODE_ENV)) {
    app.use(express.static(`${__dirname}/client/build`));
}

// View
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Logging
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// Encoding
app.use(express.json({
    limit: 1000
}));
app.use(express.urlencoded({
    limit: 1000,
    parameterLimit: 10,
    extended: false
}));
app.use(hpp());

// Session Management
app.set('trust proxy', 1);
app.use(session({
    store: new RedisStore({
        client: redis.getClient(),
        ttl: 30 * 60
    }), // store to save the session in
    name: 'SID', // name of the cookie
    secret: process.env.SESSION_SECRET, // secret to hash the session id with
    resave: false, // only saves the session to the store when the session changed
    rolling: true, // resets the cookie maxage value on every request
    saveUninitialized: true, // associate a session id with unauthorized users
    proxy: true,
    cookie: {
        httpOnly: true,
        hostOnly: true,
        domain: process.env.DOMAIN,
        maxAge: 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// CSRF
app.use(csrf());
// TODO: implement csrf on our own? should be randomly secure numbers
app.use((req, res, next) => {
    const token = req.csrfToken();

    res.cookie('CSRF', token, {
        httpOnly: false,
        hostOnly: true,
        domain: process.env.DOMAIN,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });
    res.locals.csrfToken = token;

    next();
});

/**
 * ROUTES
 */

// API
app.use('/users', UserController);
app.use('/auth', AuthController);

// React Routes
if (['devb', 'test'].includes(process.env.NODE_ENV)) {
    app.use((req, res) => {
        res.sendFile(path.join(`${__dirname}/client/build/index.html`));
    });
}

/**
 * ERROR HANDLING
 */

// Error Logging
app.use((err, req, res, next) => {
    devLogger.error(err);
    next(err);
});

// Error Handler
app.use(errorHandler());

/**
 * SERVER
 */

app.listen(process.env.PORT || 1928, () => {
    devLogger.info(`Listening at ${process.env.URL}`);
});

module.exports = app;
