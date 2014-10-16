#! /usr/bin/env node

var LTBR       = require('level-tbr')
var hyperquest = require('hyperquest')
var toPull     = require('stream-to-pull-stream')
var pull       = require('pull-stream')
var split      = require('pull-split')
var csvLine    = require('csv-line')
var url        = require('url')
var qs         = require('querystring')
var http       = require('http')
var stack      = require('stack')
var route      = require('tiny-route')
var periods    = require('time-period').periods
var stringify  = require('pull-stringify')
var query      = require('./query')
var createDb   = require('./db')

var version    = require('./package.json').version

module.exports = function (config) {

  var db = createDb(config)

  var tbr = LTBR(db, function (since) {
    var u = url.format({
        protocol: 'http',
        hostname: config.megaHost,
        port: config.megaPort,
        pathname: '/query',
        search: qs.encode({gt: since})
      })

    console.error('GET', u)
    return pull(
      toPull(hyperquest(u)),
      split(),
      pull.filter(function (e) {
        return e && e.length
      }),
      pull.map(csvLine.decode)
    )
  })

  //load views from the config file.
  //(TODO, post views via http)

  var views = config.views

  for(var name in views) (function (name) {
    var v = views[name]
    if     (v.stats) v = query.stats(v.stats)
    else if(v.count) v = query.count(v.count)
    else
      throw new Error('view may be type "count" or "stats"')

    tbr.addQuery({
      name   : name,
      map    : v.filter,
      reduce : v.reduce
    })
  })(name)

  var qdb = db.sublevel('queries')

  function filter (q, opts) {
    var d = q.dump()
      .filter(function (e) {
        return e.value != null && (opts.period ? e.type === opts.period : true)
      })
    return opts.period ? d[0] : d
  }

  return http.createServer(stack(
    route.get(/^\/view\/(\w+)/, function (req, res, next) {
      var opts = qs.decode(url.parse(req.url).query)
      opts.name = req.params[0]

      try {
        pull(
          tbr.query(opts),
          pull.map(function (d) {
            return {key: d.key[2], value: d.value}
          }),
          opts.lines ? stringify.lines() : stringify(),
          toPull.sink(res)
        )
      } catch (err) {
        return next(err)
      }
    }),
    route.get(/^\/views/, function (req, res, next) {
      res.end(JSON.stringify(Object.keys(tbr.queries), null, 2) + '\n')
    }),
    route.get(/^\/state\/(\w+)/, function (req, res, next) {
      var name = req.params[0]
      var query = tbr.queries[name]
      var opts = qs.decode(url.parse(req.url).query)

      if(!query)
        return next(new Error('unknown query:'+name))
      var data = filter(query, opts)

      res.end(JSON.stringify(data, null, 2) + '\n')
    }),
    route.get(/^\/state/, function (req, res, next) {
      var opts = qs.decode(url.parse(req.url).query)
      var d = {}
      for(var name in tbr.queries) {
        var q = tbr.queries[name]
        if('function' === typeof q.dump)
          d[name] = filter(q, opts)
      }
      res.end(JSON.stringify(d, null, 2) + '\n')
    }),
    route.get(/^\/$/, function (req, res, next) {
      res.end(
        JSON.stringify({
          views: '/views',
          view: '/view/{name}',
          viewState: '/state/{name}',
          allState: '/state'
        }, null, 2) + '\n'
      )

    }),
    route.get(/^\/version$/, function (req, res, next) {
      res.end(version + '\n')
    })
//    route.post(/^\/(count|sum)\/(\w+)\//, function (req, res, next) {
//      var type = req.params[0]
//      var name = req.params[1]
//      console.log(type, name, req.url)
//      var line = csvLine.decode(req.url)
//      res.end('ok')
//    })
  ))

}

if(!module.parent) {
  var config = require('./config')
  var server = module.exports(config)
  server.listen(config.viewPort)
}
