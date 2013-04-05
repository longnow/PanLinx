var config = require('./config'),
    sqlite3 = require('sqlite3');

module.exports = new sqlite3.Database(__dirname + '/' + config.db);
