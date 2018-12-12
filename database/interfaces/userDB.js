import db from '../arangodb';

function getAllUsers() {
    return db.query('FOR x IN User RETURN x')
        .then(value => value.all());
}

function getUserById(userId) {
    const bindVars = { userId };
    return db.query('FOR x IN User FILTER x._key == @userId RETURN x', bindVars)
        .then(value => value.next());
}

function addUser(user) {
    const bindVars = { key: user._key, username: user.username };

    return db.query('INSERT { _key:@key, username:@username } IN User RETURN' +
        ' NEW', bindVars)
        .then(value => value.next());
}

function updateUser(user) {
    const bindVars = { key: user._key, username: user.username };

    return db.query('FOR x IN User FILTER x._key == @key UPDATE x WITH { username:@username } ' +
        'IN User LET updated = NEW RETURN updated', bindVars)
        .then(value => value.all());
}

function removeUser(userKey) {
    const bindVars = { userKey };

    return db.query('FOR x IN User FILTER x._key == @userKey REMOVE x IN User LET removed =' +
        ' OLD RETURN removed', bindVars)
        .then(value => value.next());
}

const userDB = {
    getAllUsers,
    getUserById,
    addUser,
    updateUser,
    removeUser
};

export default userDB;