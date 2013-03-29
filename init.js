var config = require('./config'),
    sqlite3 = require('sqlite3'),
    panlex = require('panlex'),
    async = require('async'),
    fs = require('fs');

var exCount, 
    want, 
    td = [];

var db;

async.series([createDB, countEx, fetchTd, insertTd, insertTdg],
  function (err) {
    if (err) console.log(err);
    db.close();
    console.log('done');
  }
);

function createDB(cb) {
  if (fs.existsSync(config.db)) fs.unlinkSync(config.db);
  
  db = new sqlite3.Database(config.db);
  
  db.run('CREATE TABLE td (id integer primary key autoincrement, gp integer, beg text, end text)', 
  function (err) {
    if (err) return cb(err);
    db.run('CREATE TABLE tdg (gp integer, beg integer, end integer)', 
    function (err) {
      if (err) return cb(err);
      cb();
    });
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
  var stmt = db.prepare('INSERT INTO td (gp, beg, end) VALUES (?,?,?)');

  db.run('BEGIN', function (err) {
    if (err) return cb(err);

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