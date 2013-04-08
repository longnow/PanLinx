var config = require('./config'),
    panlex = require('panlex'),
    async = require('async'),
    fs = require('fs');

var exCount, 
    want, 
    td = [];

async.series([countEx, fetchTd],
  function (err) {
    if (err) console.log(err);
    fs.writeFileSync('td.json', JSON.stringify(td), 'utf8');
    console.log('done');
  }
);

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
      td[i] = { id: i, gp: Math.floor((i+1)/want), beg: truncate(item[0].td), end: truncate(item[1].td) };
    });
    cb();
  });
}

function truncate(str) {
  return str.substr(0, 15);
}