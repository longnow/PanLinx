var gesundheit = require('gesundheit'),
    nodes = gesundheit.nodes,
    BaseQuery = require('gesundheit/lib/queries/base'),
    SelectQuery = require('gesundheit/lib/queries/select'),
    toRelation = nodes.toRelation,
    config = require('./config');

var db = module.exports = gesundheit.engine(config.db);

BaseQuery.prototype.exec = function(cb) {
  BaseQuery.prototype.execute.call(this, function (err, result) {
    if (err) cb(err, result);
    else cb(err, result.rows || []);
  });
};

db.sql = function() {
  var args = Array.prototype.slice.call(arguments);
  var cb = args[args.length - 1];
  
  args[args.length - 1] = function (err, result) {
    if (err) cb(err, result);
    else cb(err, result.rows || []);
  }
  
  db.query.apply(this, args);  
};

SelectQuery.prototype.table = function(table, opts) {
  var rel = toRelation(table);
  
  if (!this.q.relations.get(rel.ref(), false)) {
    this.q.relations.addNode(new Table(rel));

    if (opts && opts.fields) {
      this.fields.apply(this, opts.fields);    
    }
  }
  
  return this;
};

var __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __hasProp = {}.hasOwnProperty;

Table = (function(_super) {
  __extends(Table, _super);

  function Table(relation) {
    var nodes;
    this.relation = relation;
    nodes = [this.relation];
    Table.__super__.constructor.call(this, nodes);
  }

  Table.prototype.ref = function() {
    return this.relation.ref();
  };
  
  Table.prototype.render = function(dialect) {
    return ", " + Table.__super__.render.apply(this, arguments);
  };

  return Table;

})(nodes.FixedNodeSet);