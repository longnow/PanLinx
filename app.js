var express = require('express');
var errorHandler = require('errorhandler');
var logger = require('morgan');
var path = require('path');
var sprintf = require('sprintf').sprintf;
var ucs2 = require('punycode').ucs2;

var config = require('./config');
var panlex = require('./panlex');

var index = require('./index');
var td = index.td;
var gp = index.gp;
var uidTt = index.uidTt;
var tdg = [];

gp.forEach(function (item, i) {
  tdg[i] = { beg: truncate(td[item[0]].beg), end: truncate(td[item[1]].end) };
});

var app = express();

app.set('port', config.port || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

if (app.get('env') === 'development') app.use(logger('dev'));

app.use(setHeaders);
app.use(express.static(path.join(__dirname, 'public')));

if (app.get('env') === 'development') app.use(errorHandler());

app.locals.title = 'PanLinx';
app.locals.startPage = false;
app.locals.base = config.base;
app.locals.robot = true;
app.locals.uidTt = uidTt;

app.get('/', indexRoute);
app.get('/gp/:gp', gpRoute);
app.get('/gp/:gp/sub/:id', subgpRoute);
app.get('/ex/:ex', exRoute);

app.listen(app.get('port'), '127.0.0.1', function(){
  console.log("Express server listening on port " + app.get('port'));
});

function setHeaders(req, res, next) {
  res.set('Expires', 0);
  next();
}

function indexRoute(req, res, next) {
  res.render('index', { tdg: tdg, startPage: true });    
}

function gpRoute(req, res, next) {
  if (!req.params.gp.match(/^\d+$/)) return next();
  var num = Number(req.params.gp);
  
  var subr = [];
  var first = gp[num][0], last = gp[num][1];
  for (var i = first; i <= last; i++) {
    subr.push({
      id: td[i].id,
      beg: truncate(td[i].beg),
      end: truncate(td[i].end)
    });
  }
  
  res.render('gp', { gp: num, subr: subr });
}

function subgpRoute(req, res, next) {
  if (!req.params.id.match(/^\d+$/)) return next();
  var id = Number(req.params.id);
  var tuple = td[id];
  
  panlex.queryAll('/ex', 
    { include: 'uid', sort: ['td', 'tt', 'uid'], range: ['td', tuple.beg, tuple.end] },
  function (err, data) {
    if (err) return next(err);
    res.render('subgp', { exxr: data.result });  
  });
}

function exRoute(req, res, next) {
  if (!req.params.ex.match(/^\d+$/)) return next('invalid expression ID');
  var ex = Number(req.params.ex);
  
  panlex.query('/ex/' + ex, { include: 'uid' },
  function (err, data) {
    if (err) return next(err);
    
    var exx = data.ex;
    
    panlex.queryAll('/ex', { trex: [ex], include: 'uid', sort: ['uid','tt'] },
    function (err, data) {
      if (err) return next(err);
      
      res.render('ex', {
        title: 'PanLinx: ' + exx.tt,
        exx: exx,
        trxr: data.result,
        robot: false
      });
    });
  });
}

function truncate(str) {
  return ucs2.encode(ucs2.decode(str).slice(0, 15));
}
