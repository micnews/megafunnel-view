var r = require('./reduce')
var legacy = require('./legacy')
var columns = require('condor/columns.json')
var csvLine = require('csv-line')

function isString(s) {
  return 'string' === typeof s
}

function isFunction (f) {
  return 'function' === typeof f
}

var cIndex = {}

for(var version in columns) {
  var v = cIndex[version] = {}
  columns[version].forEach(function (name, i) {
    v[name] = i
  })
}

function id (value) { return value }

function query (rule) {

  if(isString(rule)) return legacy(rule)

  var obj = {}
  for(var key in rule) (function (key, value) {
    if(true === value)
      obj[key] = id
    else if(/{/.test(value)) { //convert to regular expression
      var rx = new RegExp(value.replace(/{\w+}/, '(.*)'))
      obj[key] = function (value) {
        var m = rx.exec(value)
        return m && m[1]
      }
    }
    else
      obj[key] = value

  })(key, rule[key])

  return function (data) {
    if('string' === typeof data)
      data = csvLine.decode(data)
    var client = data[0]
    var m = /^(\d+\.\d+)\.\d+/.exec(data[1])

    //1.1 is last version befor columns where added.
    var version = m ? m[1] : '1.1'
    var columns = cIndex[version]

    //can't process version we do not recognise
    if(!columns) return

    var target
    for(var key in rule) {
      var rvalue = rule[key]
      var value = data[columns[key] + 1]
      if(rvalue === true)
        target = value
      else if(isString(rvalue)) {
        if(rvalue !== value) return
      }
      else if(isFunction(rvalue))
        target = rvalue(value)
    }

    return target
  }
}

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


exports.count = function (rule) {
  return reduce(rule, r.count)
}

exports.stats = function (rule) {
  return reduce(rule, r.stats)
}


