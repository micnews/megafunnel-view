if(!module.parent) {
  var split = require('split')
  var opts = require('minimist')(process.argv.slice(2))
  var through = require('through')

  var reduce
  if(opts.count)
    reduce = exports.count(opts.count)
  else if(opts.stats)
    reduce = exports.stats(opts.stats)
  else
    throw new Error('expects --count PATTERN or --stats PATTERN')

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

}
