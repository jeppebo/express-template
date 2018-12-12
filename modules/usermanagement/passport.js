// Passport
import passport from 'passport';
import localStrategy from 'passport-local';
import FacebookStrategy from 'passport-facebook';
import GoogleStrategy from 'passport-google-oauth20';

// Config
import { facebook, google } from './config';

// Util
import authService from '../../database/services/authService';
import validator from '../../modules/security/validator';

const LocalStrategy = localStrategy.Strategy;

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, (email, password, done) => {
    const data = validator.login({ email, password });

    authService.verifyUser(data.email, data.password).then((user) => {
        return done(null, { id: user._key, email: user.email });
    }).catch((error) => {
        return done(error);
    });
}));

// Register Facebook Passport strategy
passport.use(new FacebookStrategy(facebook, (accessToken, refreshToken, profile, done) => {
    const data = validator.socialLogin({
        name: profile.name,
        email: profile.email
    });

    authService.verifySocialUser('facebook', data.name, data.email).then((user) => {
        return done(null, { id: user._key, email: user.email });
    }).catch((error) => {
        return done(error);
    });
}));

// Register Google Passport strategy
passport.use(new GoogleStrategy(google, (accessToken, refreshToken, profile, done) => {
    const data = validator.socialLogin({
        name: profile.displayName,
        email: profile.emails[0].value
    });

    authService.verifySocialUser('google', data.name, data.email).then((user) => {
        return done(null, { id: user._key, email: user.email });
    }).catch((error) => {
        return done(error);
    });
}));

// Serialize user into the sessions
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user from the sessions
passport.deserializeUser((user, done) => {
    done(null, user);
});

export default passport;