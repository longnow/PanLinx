var express = require('express'),
    http = require('http'),
    path = require('path'),
    sprintf = require('sprintf').sprintf,
    db = require('./db'),
    config = require('./config'),
    gesundheit = require('gesundheit'),
    text = gesundheit.text,
    sqlFunction = gesundheit.sqlFunction;

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
  startPage: false,
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
  db.select('tdg', ['gp', 'tdbeg', 'tdend'])
  .order('gp')
  .exec(function (err, gpr) {
    if (err) return res.send(err);
    res.render('index', { gpr: gpr, startPage: true });
  });
}

function lv0(req, res, next) {
  if (!req.params.gp.match(/^\d+$/)) return next();
  
  var q = db.select('td', ['id', 'tdbeg', 'tdend']);
  q = q
  .where(q.p('gp').eq(req.params.gp))
  .order('id')
  .exec(function (err, subr) {
    if (err) return res.send(err);
    res.render('lv0', { subr: subr });
  });
}

function lv1(req, res, next) {
  if (!req.params.id.match(/^\d+$/)) return next();

  var q = db.select('td', ['tdbeg', 'tdend']);
  q.where(q.p('id').eq(req.params.id))
  .exec(function (err, tuple) {
    if (err) return res.send(err);

    tuple = tuple[0];
    
    q = db.select({ex1: 'ex'}, [{'ex1ex': 'ex'}, {'ex1tt': 'tt'}]);
    q = q
      .join('lv', { on: { lv: q.p('ex1','lv') }, fields: ['lc', 'vc'] })
      .join({ex2: 'ex'}, { on: { ex: q.p('lv','ex') }, fields: [{'ex2tt': 'tt'}] })
      .where(text('ex1.td between $0 and $1', [tuple.tdbeg, tuple.tdend]))
      .order('ex1.tt', 'lv.lc', 'lv.vc');
    
    q.exec(function (err, exxr) {
      if (err) return res.send(err);
      res.render('lv1', { exxr: exxr });
    });
  });
}

function lv2(req, res, next) {
  if (!req.params.ex.match(/^\d+$/)) return next();
  
  db.select(sqlFunction('exx',[req.params.ex]).as('exx'), ['lc','vc','lvextt','extt'])
  .exec(function (err, exx) {
    exx = exx[0];
    db.select(sqlFunction('trsx', [req.params.ex]).as('trsx'), ['ex','lc','vc','lvextt','extt'])
    .exec(function (err, trxr) {
      res.render('lv2', {
        title: 'PanLinx: ' + exx.extt,
        exx: exx,
        trxr: trxr,
        robot: false
      });
    });
  });
}
