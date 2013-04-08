var express = require('express'),
    http = require('http'),
    path = require('path'),
    sprintf = require('sprintf').sprintf,
    gesundheit = require('gesundheit'),
    select = gesundheit.select,
    text = gesundheit.text,
    sqlFunction = gesundheit.sqlFunction;

var config = require('./config'),
    db = require('./db'),
    panlex = require('panlex');

var app = express();

app.configure(function() {
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

app.configure('development', function() {
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
app.get('/gp/:gp', gp);
app.get('/gp/id/:id', gpId);
app.get('/ex/:ex', ex);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

function setHeaders(req, res, next) {
  res.set('Expires', 0);
  next();
}

function index(req, res, next) {
  var q = select('tdg').order('gp');
  db.all(q.compile()[0], function (err, rows) {
    res.render('index', { tdg: rows, startPage: true });    
  });
}

function gp(req, res, next) {
  if (!req.params.gp.match(/^\d+$/)) return next();
  req.params.gp = Number(req.params.gp);
  
  var q = select('td', ['id','beg','end']).where({gp: req.params.gp}).order('id'),
      sql = q.compile();
  db.all(sql[0], sql[1], function (err, subr) {
    if (err) return next(err);
    res.render('gp', { subr: subr });
  });
}

function gpId(req, res, next) {
  if (!req.params.id.match(/^\d+$/)) return next();
  req.params.id = Number(req.params.id);

  var q = select('td', ['beg', 'end']).where({ id: req.params.id }),
      sql = q.compile();
  db.all(sql[0], sql[1], function (err, tuple) {
    if (err) return next(err);

    tuple = tuple[0];
    
    panlex.queryAll('/ex', 
      { include: "lv", sort: ["tt", "lv.lc", "lv.vc"], range: ["td", tuple.beg, tuple.end] },
    function (err, data) {
      if (err) return next(err);
      res.render('gp_id', { exxr: data.result });  
    });
  });
}

function ex(req, res, next) {
  if (!req.params.ex.match(/^\d+$/)) return next('invalid expression ID');
  req.params.ex = Number(req.params.ex);
  
  panlex.query('/ex/' + req.params.ex, { include: 'lv' },
  function (err, data) {
    if (err) return next(err);
    
    var exx = data.ex;
    
    panlex.queryAll('/ex', { tr: [req.params.ex], include: 'lv', sort: ['lv.lc','lv.vc','tt'] },
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
