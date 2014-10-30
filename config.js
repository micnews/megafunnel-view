//c/p this from megafunnel... maybe should just publish as a module?
var path = require('path')
var fs = require('fs')

var xtend = require('xtend')
var argv = require('minimist')(process.argv.slice(2))

var config = {
  megaPort: 4000,
  megaNetPort: 4002,

  //
  //this is only so that it works by default in dev.
  //this is the first thing you will override in production.
  //
  megaHost: 'localhost',
  funnelHost: 'localhost',
  funnelPort: 4001,
  viewPort: 4003,
  maxSize: 1024*1024*1024,
  logDir: path.join(process.env.HOME, '.megafunnel')
}

if (argv.config) {
  var userconfig = require(argv.config)
  config = xtend(config, userconfig)
}

module.exports = require('rc')('megafunnel', config);

