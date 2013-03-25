var config = require('./config'),
    gesundheit = require('gesundheit'),
    BaseQuery = require('gesundheit/lib/queries/base');

var db = module.exports = gesundheit.engine(config.db);

BaseQuery.prototype.exec = function(cb) {
  BaseQuery.prototype.execute.call(this, function (err, result) {
    if (err) cb(err, result);
    else cb(err, result.rows || []);
  });
};

db.sql = function() {
  var args = Array.prototype.slice.call(arguments);
  var cb = args[args.length - 1];
  
  args[args.length - 1] = function (err, result) {
    if (err) cb(err, result);
    else cb(err, result.rows || []);
  }
  
  db.query.apply(this, args);  
};