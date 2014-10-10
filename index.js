var level      = require('level')
var sublevel   = require('level-sublevel/bytewise')
var mkdirp     = require('mkdirp')
var join       = require('path').join
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

module.exports = function (config) {
  var dbPath = join(config.logDir, 'view-db')
  mkdirp.sync(dbPath)

  var db = sublevel(level(dbPath, {valueEncoding: 'json'}))
  var tbr = LTBR(db, function (since) {
    var u = url.format({
        protocol: 'http',
        hostname: config.megaHost,
        port: config.megaPort,
        pathname: '/query',
        search: qs.encode({gt: since})
      })

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
      map    : function (data) {
        console.log('filter', v.filter(data))
        return v.filter(data)
      },
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
