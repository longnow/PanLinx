var config = require('./config'),
    panlex = require('panlex'),
    async = require('async'),
    fs = require('fs');

var exCount, 
    want, 
    td = [];

if (fs.existsSync(config.db)) fs.unlinkSync(config.db);

var db = require('./db');

async.series([initDB, countEx, fetchTd, insertTd, insertTdg],
  function (err) {
    if (err) console.log(err);
    db.close();
    console.log('done');
  }
);

function initDB(cb) {
  db.exec(
    'CREATE TABLE td (id integer primary key autoincrement, gp integer, beg text, end text);' + 
    'CREATE TABLE tdg (gp integer, beg integer, end integer)', 
  function (err) {
    if (err) return cb(err);
    cb();
  });
}

function countEx(cb) {
  panlex.query('/ex', { count: true }, function (err, data) {
    if (err) return cb(err);
    exCount = data.count;
    want = Math.ceil(Math.pow(exCount, 1/3));
    cb();
  });
}

function fetchTd(cb) {  
  panlex.query('/ex/index', { step: want }, function (err, data) {
    if (err) return cb(err);
    
    data.index.forEach(function (item, i) {
      td.push({ gp: Math.floor((i+1)/want), beg: truncate(item[0].td), end: truncate(item[1].td) });
    });
    cb();
  });
}

function insertTd(cb) {
  db.run('BEGIN', function (err) {
    if (err) return cb(err);

    var stmt = db.prepare('INSERT INTO td (gp, beg, end) VALUES (?,?,?)');

    async.each(td, 
      function (item, cb) {
        stmt.run(item.gp, item.beg, item.end, cb);
      },
      function (err) {
        if (err) return cb(err);
        stmt.finalize();
        db.run('COMMIT', cb);
      });
  });
}

function insertTdg(cb) {
  var sql = 'INSERT INTO tdg (gp, beg, end) SELECT gp, min(beg), max(end) FROM td GROUP BY gp ORDER BY gp';
  
  db.run(sql, function (err) {
    if (err) return cb(err);
    cb();
  });
}

function truncate(str) {
  return str.substr(0, 15);
}