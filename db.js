var anyDB = require('any-db'),
    config = require('./config');

module.exports = anyDB.createConnection(config.db);
