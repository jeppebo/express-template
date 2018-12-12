// Joi
import joi from 'joi';

// Error
import Boom from 'boom';
import ERR from '../../error/errorCodes';

// Util
import { ROLES } from '../usermanagement/config';

const keySchema = joi.string().min(1, 'utf-8').max(254, 'utf-8')
    .regex(/^[a-zA-Z0-9_\-:.@()+,=;$!*'%]*$/);
const emailSchema = joi.string().min(3).max(254).email();
const passwordSchema = joi.string()
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[~!@#$%^&*()_=+{}[\]|\\;:'"?/<,>.-]).{10,128}$/);
const usernameSchema = joi.string().max(50).alphanum();
const roleSchema = joi.string().valid(Object.values(ROLES));
const nameSchema = joi.string().max(50).regex(/^[^!"#$%&()*+/:;<+>?@[\]\\^_`{}|~0-9]*$/);
const tokenSchema = joi.string().hex().length(20, 'hex');

const loginSchema = joi.object().keys({
    email: emailSchema.required(),
    password: passwordSchema.required()
});

const socialLoginSchema = joi.object().keys({
    name: nameSchema.required(),
    email: emailSchema.required()
});

const registerSchema = joi.object().keys({
    email: emailSchema.required(),
    password: passwordSchema.required(),
    username: usernameSchema.required(),
    role: roleSchema.required()
});

const redirectSchema = joi.object().keys({
    username: usernameSchema.required(),
    id: keySchema.required(),
    token: tokenSchema.required()
});

function validate(input, schema, value) {
    const result = joi.validate(input, schema);

    if (result.error) {
        const field = value || result.error.message.split('"')[1];
        throw Boom.badData(result.error, {
            response: `${ERR.MSG.WRONG_INPUT} (${field})`,
            type: ERR.TYPE.INPUT,
            input: result.value
        });
    }

    return result.value;
}

function email(input) {
    return validate(input, emailSchema, 'email');
}

function password(input) {
    return validate(input, passwordSchema, 'password');
}

function login(input) {
    return validate(input, loginSchema);
}

function socialLogin(input) {
    return validate(input, socialLoginSchema);
}

function register(input) {
    return validate(input, registerSchema);
}

function redirectLink(input) {
    return validate(input, redirectSchema);
}

const validator = {
    email,
    password,
    login,
    register,
    redirectLink,
    socialLogin
};

export default validator;