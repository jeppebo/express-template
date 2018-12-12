import db from '../arangodb';

// [GET]: /users/{userKey}
function getUserById(userId) {
    const bindVars = { userId };
    return db.query('FOR x IN Auth FILTER x._key == @userId RETURN x', bindVars)
        .then(value => value.next());
}

// [GET]: /users/{userKey}
function getUserByEmail(email) {
    const bindVars = { email };
    return db.query('FOR x IN Auth FILTER x.email == @email RETURN x', bindVars)
        .then(value => value.next());
}

// [POST]: /users
function addUser(user) {
    return db.query('INSERT { email:@email, username:@username, password:@password, type:@type,' +
        ' role:@role }' +
        ' IN Auth RETURN' +
        ' NEW', user)
        .then(value => value.next());
}

// [POST]: /users/{userKey}/update
function updateUser(user) {
    const bindVars = {
        key: user._key,
        password: user.password,
        email: user.email,
        email_verified: user.email_verified
    };

    return db.query('FOR x IN Auth FILTER x._key == @key UPDATE x WITH { password:@password,' +
        ' email:@email, email_verified:@email_verified } IN Auth LET updated = NEW RETURN' +
        ' updated', bindVars)
        .then(value => value.next());
}

// [GET]: /users/{userKey}/delete
function removeUser(userKey) {
    const bindVars = { userKey };

    return db.query('FOR x IN Auth FILTER x._key == @userKey REMOVE x IN Auth LET removed = OLD RETURN removed', bindVars)
        .then(value => value.next());
}

const authDB = {
    getUserById,
    getUserByEmail,
    addUser,
    updateUser,
    removeUser
};

export default authDB;