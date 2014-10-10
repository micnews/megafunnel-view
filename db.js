var mkdirp     = require('mkdirp')
var join       = require('path').join
var level      = require('level')
var sublevel   = require('level-sublevel/bytewise')


module.exports = function (config) {
  var dbPath = join(config.logDir, 'view-db')
  mkdirp.sync(dbPath)

  return sublevel(level(dbPath, {valueEncoding: 'json'}))
}

if(!module.parent) {
  var db = module.exports(require('./config'))

  db.createReadStream().on('data', console.log)
}
