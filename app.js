var express = require('express'),
    http = require('http'),
    path = require('path'),
    sprintf = require('sprintf').sprintf;

var config = require('./config'),
    panlex = require('panlex');

var index = require('./index'),
    td = index.td,
    gp = index.gp,
    tdg = index.tdg;

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

app.get('/', indexRoute);
app.get('/gp/:gp', gpRoute);
app.get('/gp/:gp/sub/:id', subgpRoute);
app.get('/ex/:ex', exRoute);

http.createServer(app).listen(app.get('port'), function(){
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
  
  res.render('gp', { gp: num, subr: td.slice(gp[num][0], gp[num][1] + 1) });
}

function subgpRoute(req, res, next) {
  if (!req.params.id.match(/^\d+$/)) return next();
  var id = Number(req.params.id);
  var tuple = td[id];
  
  panlex.queryAll('/ex', 
    { include: "lv", sort: ["td", "tt", "lv.lc", "lv.vc"], range: ["td", tuple.beg, tuple.end] },
  function (err, data) {
    if (err) return next(err);
    res.render('subgp', { exxr: data.result });  
  });
}

function exRoute(req, res, next) {
  if (!req.params.ex.match(/^\d+$/)) return next('invalid expression ID');
  var ex = Number(req.params.ex);
  
  panlex.query('/ex/' + ex, { include: 'lv' },
  function (err, data) {
    if (err) return next(err);
    
    var exx = data.ex;
    
    panlex.queryAll('/ex', { tr: [ex], include: 'lv', sort: ['lv.lc','lv.vc','tt'] },
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
