var config = require('./config'),
    panlex = require('panlex'),
    async = require('async'),
    fs = require('fs');

var exCount, 
    want, 
    td = [],
    tdg = [];

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
  var id = 1;
  
  panlex.query('/ex/index', { step: want }, function (err, data) {
    if (err) return cb(err);
    
    data.index.forEach(function (item, i) {
      td.push({ id: id++, gp: Math.floor((i+1)/want), beg: truncate(item[0].td), end: truncate(item[1].td) });
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
  td.forEach(function (item) {
    if (!tdg[item.gp]) 
      tdg[item.gp] = { gp: item.gp, beg: item.beg, end: item.end, endId: item.id };
    else if (item.id > tdg[item.gp].endId) {
      tdg[item.gp].endId = item.id;
      tdg[item.gp].end = item.end;
    }
  });
  
  db.run('BEGIN', function (err) {
    if (err) return cb(err);

    var stmt = db.prepare('INSERT INTO tdg (gp, beg, end) VALUES (?,?,?)');

    async.each(tdg, 
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

function truncate(str) {
  return str.substr(0, 15);
}