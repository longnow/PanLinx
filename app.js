var express = require('express'),
    http = require('http'),
    path = require('path'),
    sprintf = require('sprintf').sprintf,
    db = require('./db'),
    config = require('./config');

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
  base: config.base,
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
  db.sql('select gp, tdbeg, tdend from tdg order by gp',
  function (err, gpr) {
    if (err) return res.send(err);
    res.render('index', { gpr: gpr });
  });
}

function lv0(req, res, next) {
  if (!req.params.gp.match(/^\d+$/)) return next();
  
  db.sql('select id, tdbeg, tdend from td where gp = $1 order by id', [req.params.gp],
  function (err, subr) {
    if (err) return res.send(err);
    res.render('lv0', { subr: subr });
  });
}

function lv1(req, res, next) {
  if (!req.params.id.match(/^\d+$/)) return next();

  db.sql('select tdbeg, tdend from td where id = $1', [req.params.id],
  function (err, tuple) {
    if (err) return res.send(err);

    tuple = tuple[0];
    db.sql('select ex1.ex ex1ex, lc, vc, ex2.tt ex2tt, ex1.tt ex1tt from ex as ex1, ex as ex2, lv ' +
      'where ex1.td between $1 and $2 and lv.lv = ex1.lv ' +
      'and ex2.ex = lv.ex order by ex1.tt, lc, vc', [tuple.tdbeg, tuple.tdend],
    function (err, exxr) {
      if (err) return res.send(err);
      res.render('lv1', { exxr: exxr });
    });
  });
}

function lv2(req, res, next) {
  if (!req.params.ex.match(/^\d+$/)) return next();

  db.sql('select lc, vc, lvextt, extt from exx ($1)', [req.params.ex],
  function (err, exx) {
    exx = exx[0];
    db.sql('select ex, lc, vc, lvextt, extt from trsx ($1)', [req.params.ex],
    function (err, trxr) {
      res.render('lv2', {
        title: 'PanLinx: ' + exx.extt,
        exx: exx,
        trxr: trxr,
        robot: false
      });
    });
  });
}
