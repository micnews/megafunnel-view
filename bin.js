#! /usr/bin/env node

var query = require('./query')
var csvLine = require('csv-line')

var split = require('split')
var opts = require('./config')
var through = require('through')

opts.buckets = opts.buckets || 'Minutes'

function parse (p) {
  try { p = JSON.parse(p) } catch (err) { }
  return p
}

var reduce
//perform a named query from the config file.
if(opts.query) {
  var q = opts.views[opts.query]
  if(q.count)
    reduce = query.count(q.count)
  else if(q.stats)
    reduce = query.stats(q.stats)
  else
    throw new Error('query:'+opts.query+' must have "count" or "stats" property')
}
else {

if(opts.count)
  reduce = query.count(parse(opts.count))
else if(opts.stats)
  reduce = query.stats(parse(opts.stats))
else
  throw new Error('expects --count PATTERN or --stats PATTERN or --query NAME')
}

var buckets = (opts.buckets || '')
  .split(',').map(function (s) { return s.toUpperCase() })

var TBR = require('time-bucket-reduce')({
  map: function (line) {
    return reduce.filter(line)
  },
  reduce: reduce.reduce,
  output: function (value, start, part) {
    if(~buckets.indexOf(part.toUpperCase()))
      console.log('==', value, start, part)
  }
})

var acc = null

var p = Date.now()

var queryStream = opts.buckets
? through(function (data) {
  if(data.length) TBR(data)
}, function () {
  console.log(TBR.dump())
})
: through(function (data) {
    acc = reduce(acc, data)
    var ts = Date.now()
    if(p + 100 < ts) {
      p = ts
      console.log(acc)
    }
  }, function () {
    console.log(acc)
  })

process.stdin
  .pipe(split())
  .pipe(through(function (l) {
    this.queue(csvLine.decode(l))
  }))
  .pipe(queryStream)


