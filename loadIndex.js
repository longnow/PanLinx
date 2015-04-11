var panlex = require('./panlex');
var async = require('async');
var fs = require('fs');

var exCount;
var want;
var td = [];
var uidTt = {};

async.series([countEx, fetchTd, fetchLv],
  function (err) {
    if (err) console.error(err);
    else {
      writeJson();
      console.log('done');      
    }
  }
);

function countEx(cb) {
  panlex.query('/ex/count', {}, function (err, data) {
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
      td[i] = { id: i, gp: Math.floor((i+1)/want), beg: item[0].td, end: item[1].td };
    });
    cb();
  });
}

function fetchLv(cb) {
  panlex.queryAll('/lv', function (err, data) {
    if (err) return cb(err);

    data.result.forEach(function (lv) { 
      uidTt[lv.uid] = lv.tt;
    });

    cb();
  });
}

function writeJson() {
  var gp = [];
  
  var lastGp = 0;
  gp[0] = [0, 0];
    
  td.forEach(function (item, i) {
    if (item.gp !== lastGp) {
      gp[lastGp][1] = i - 1;
      lastGp++;
      gp[lastGp] = [i, 0];
    }    
  });
  
  gp[lastGp][1] = td.length - 1;
    
  fs.writeFileSync(__dirname + '/index.json', JSON.stringify({ td: td, gp: gp, uidTt: uidTt }), 'utf8');  
}