var express = require('express'),
    http = require('http'),
    path = require('path'),
    sprintf = require('sprintf').sprintf,
    entities = require('entities'),
    db = require('./db');

var app = express();

app.configure(function(){
  app.set('port', config.port || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(setHeaders);
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.locals({
  title: 'PanLinx',
  base: '/panlinx',
  robot: true,
  lcvcUid: function(obj) {
    return sprintf('%s-%03d', obj.lc, obj.vc);
  }
});

app.get('/', index);
app.get('/0/:gp', lv0);
app.get('/1/:id', lv1);
app.get('/2/:ex', lv2);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

function setHeaders(req, res, next) {
  res.set('Expires', 0);
  next();
}

function index(req, res, next) {
  db.query('select gp, tdbeg, tdend from tdg order by gp',
  function (err, gpr) {
    res.render('index', { gpr: getRows(gpr) });
  });
}

function lv0(req, res, next) {
  db.query('select id, tdbeg, tdend from td where gp = $1 order by id', [req.params.gp],
  function (err, subr) {
    res.render('lv0', { subr: getRows(subr) });
  });
}

function lv1(req, res, next) {
  db.query('select tdbeg, tdend from td where id = $1', [req.params.id],
  function (err, tuple) {
    tuple = getRows(tuple)[0];
    db.query('select ex1.ex ex1ex, lc, vc, ex2.tt ex2tt, ex1.tt ex1tt from ex as ex1, ex as ex2, lv ' +
      'where ex1.td between $1 and $2 and lv.lv = ex1.lv ' +
      'and ex2.ex = lv.ex order by ex1.tt, lc, vc', [tuple.tdbeg, tuple.tdend],
    function (err, exxr) {
      res.render('lv1', { exxr: getRows(exxr) });
    });
  });
}

function lv2(req, res, next) {
  db.query('select lc, vc, lvextt, extt from exx ($1)', [req.params.ex],
  function (err, exx) {
    exx = getRows(exx)[0];
    db.query('select ex, lc, vc, lvextt, extt from trsx ($1)', [req.params.ex],
    function (err, trxr) {
      res.render('lv2', {
        title: 'PanLinx: ' + exx.extt,
        exx: exx,
        trxr: getRows(trxr),
        robot: false
      });
    });
  });
}

function getRows(result) {
  if (result && result.rows) return result.rows;
  else return [];
}