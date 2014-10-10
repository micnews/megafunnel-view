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
    if     (v.stats) v = query.stats(q.stats)
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

  return http.createServer(stack(
    route.get(/^\/view\/(\w+)/, function (req, res, next) {
      var _url = url.parse(req.url)
      var opts = qs.decode(_url.query)
      opts.name = req.params[0]

      try {
        pull(
          tbr.query(opts),
          opts.lines ? stringify.lines() : stringify(),
          toPull.sink(res)
        )
      } catch (err) {
        return next(err)
      }
    }),
    route.get(/^\/state\/(\w+)/, function (req, res, next) {
      var name = req.params[0]
      var query = tbr.queries[name]
      if(!query)
        return next(new Error('unknown query:'+name))
      var data = query.dump().filter(function (e) { return e.value != null })
      res.end(JSON.stringify(data, null, 2) + '\n')
    }),
    route.get(/^\/state/, function (req, res, next) {
      var d = {}
      for(var name in tbr.queries) {
        var q = tbr.queries[name]
        if('function' === typeof q.dump)
          d[name] = q.dump().filter(function (e) { return e.value != null })
      }
      res.end(JSON.stringify(d, null, 2) + '\n')
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
