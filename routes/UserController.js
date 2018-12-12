// Express
import express from 'express';

// Error
import Boom from 'boom';
import ERR from '../error/errorCodes';

// Logging
import devLogger from '../modules/logging/devLogger';

// Database
import userDB from '../database/interfaces/userDB';

// Util
import permission from '../modules/usermanagement/permissions';

// create router
const router = express.Router();

// get /users/info
router.get('/info', permission.isLoggedIn, (req, res) => {
    res.send(req.user);
});

// get /users/
router.get('/', (req, res) => {
    devLogger.debug(req.query);
    res.send('GET response');
});

// post /users/
router.post('/', (req, res) => {
    devLogger.debug(req.body);
    res.send('POST response');
});

// put /users/
router.put('/', (req, res) => {
    res.send('PUT response');
});

// delete /users/
router.delete('/', (req, res) => {
    res.send('DELETE response');
});

module.exports = router;