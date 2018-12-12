const MSG = {
    WRONG_CREDENTIALS: 'Wrong email or password.',
    EMAIL_EXISTS: 'Email already exists.',
    EMAIL_NOT_VERIFIED: 'Email is not verified.',
    EMAIL_NOT_SENT: 'Email could not be send.',
    USER_EXISTS: 'Username already exists.',
    USER_NOT_FOUND: 'Email could not be found.',
    USER_WRONG_TYPE: 'Please login with',
    SOCIAL_USER_PASSWORD: 'You cannot change your password if you registered with Google or' +
    ' Facebook',
    SOCIAL_USER_EMAIL: 'You cannot change your email if you registered with Google or Facebook.',
    LINK_EXPIRED: 'This link expired.',
    UNAUTHORIZED: 'Please login first.',
    WRONG_INPUT: 'Please check your input again.',
    FILE_NOT_FOUND: 'You haven\'t sent a file.',
    FILE_NOT_SENT: 'File could not be uploaded.',
    NO_MATCH: 'do not match.',
    DEFAULT: 'Something went wrong!'
};

const TYPE = {
    AUTH: 'Authentication',
    DB: 'Database',
    SEC: 'Security',
    SERVER: 'Server',
    INPUT: 'Input Validation'
}

const ERR = {
    MSG,
    TYPE
}

export default ERR;