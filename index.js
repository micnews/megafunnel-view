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

module.exports = function (config) {
  var dbPath = join(config.logDir, 'view-db')
  mkdirp.sync(dbPath)

  var db = sublevel(level(dbPath, {valueEncoding: 'json'}))
  var tbr = LTBR(db, function (since) {
    return pull(
      toPull(hyperquest(url.format({
        protocol: 'http',
        host: config.megaHost,
        port: config.megaPort,
        pathname: '/query',
        search: qs.encode({gt: since})
      }))),
      split(),
      pull.map(csvLine.decode)
    )
  })

  //okay what about queries?
  //should I just have default queries?

  var qdb = db.sublevel('queries')

  return http.createServer(stack(
    route.get(/^\/view\/(\w+)/, function (req, res, next) {
      var _url = url.parse(req.url)
      var opts = qs.decode(_url.query)
      opts.name = req.params[0]
      console.log(opts)
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

  ))
}

if(!module.parent) {
  var config = require('./config')
  var server = module.exports(config)
  server.listen(config.viewPort)
}
