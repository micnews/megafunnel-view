var csvLine = require('csv-line')

function query (string) {
  var keys = 0
  var line = csvLine.decode(string).map(function (e) {
    if(/{/.test(e)) { //convert to regular expression
      var rule = new RegExp(e.replace(/{\w+}/, '(.*)'))
      keys ++
      return function (value) {
        var m = rule.exec(value)
        return m && m[1]
      }
    }
  })

  var l = line.length

  return function (row) {
    if('string' === typeof row)
      row = csvLine.decode(row)
    var obj = {}
    var key = ''
    var values = []

    if(Array.isArray(row)) {
      var l = line.length
      for(var i = 0; i < l; i++) {
        //if a hard coded string does not match, skip this row without changes.
        if('string' === typeof line[i] && line[i] !== row[i]) {
          return null
        }
        if('function' === typeof line[i]) {
          return line[i](row[i])
        }
      }
      return 1
    }
  }
}

function count (a, b) {
  if(!a) a = {}

  //treat b as the key
  if('string' === typeof b)
    a[b] = (a[b] || 0) + 1
  else if('object' == typeof b) {
    for(var k in b) {
      a[k] = (a[k] || 0) + b[k]
    }
  }
  return a
}

function stats (a, b) {
  if(!a) a = {count: 0, sum: 0, mean: 0, sumSq: 0}

  if(b == null) return a

  var _b = +b
  //b is a number
  if(!isNaN(_b)) {
    a.count ++
    a.sum += _b
    a.sumSq += _b*_b
  }
  //b is already partially aggregated.
  else {
    a.count += b.count
    a.sum += b.sum
    a.sumSq += b.sumSq
  }

  a.mean = a.sum / a.count
  a.vari = (a.sumSq / a.count) - a.mean * a.mean
  a.stddev = Math.sqrt(a.vari)
  return a
}

var line = 'condor,1.1.1,trackable-custom,,,,,,,,,,,,,,,,,ed-ab-share,articleUnitId:{articleUnitId}'

var t = query(line)

function reduce(string, agg) {
  var filter = query(string)
  function reducer (a, b) {
    if('string' === typeof b) {
      b = filter(b)
      if(!b) return a
      return agg(a, b)
    }
    return agg(a, b)
  }
  reducer.filter = filter
  reducer.reduce = agg
  return reducer
}


exports.count = function (string) {
  return reduce(string, count)
}

exports.stats = function (string) {
  return reduce(string, stats)
}

//var v =
//  t('condor,1.1.1,trackable-cusmom,,,,,,,,,,,,,,,,,ed-ab-share,articleUnitId:foo')

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
