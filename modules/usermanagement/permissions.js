// Error
import Boom from 'boom';

function isLoggedIn(req, res, next) {
    if (req.user) {
        next();
    } else {
        next(Boom.unauthorized('Unauthorized access'));
    }
}

const permission = {
    isLoggedIn
};

export default permission;