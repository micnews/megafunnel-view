var r = require('./reduce')
var legacy = require('./legacy')
var columns = require('condor/columns.json')
var csvLine = require('csv-line')
var parserx = require('parse-regexp')

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
    var rx
    if(true === value)
      obj[key] = id
    else if(rx = parserx(value)) {
      obj[key] = function (value) {
        var m = rx.exec(value)
        //match the first group
        return m && m[1]
      }
    }
    else if(/{/.test(value)) { //convert to regular expression
      rx = new RegExp(value.replace(/{\w+}/, '(.*)'))
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

    var client = data[1]
    var m = /^(\d+\.\d+)\.\d+/.exec(data[2])

    //1.1 is last version befor columns where added.
    var version = m ? m[1] : '1.1'
    var columns = cIndex[version]
    //can't process version we do not recognise
    if(!columns) return

    var targets = []
    var keys = []

    for(var key in obj) {
      var rvalue = obj[key]
      var value = data[columns[key] + 1]

      if(rvalue === true) {
        targets.push(value);
        keys.push(key);
      }
      else if(isString(rvalue)) {
        if(rvalue !== value) return
      }
      else if(isFunction(rvalue)) {
        targets.push(rvalue(value));
        keys.push(key);
      }
    }

    switch (targets.length) {
      case 0:
        //set a default value so that row counts work
        return 1
      case 1:
        return targets[0]
      default:
        var result = {}
        for (var i = 0, l = targets.length; i < l; ++i) {
          result[keys[i]] = targets[i]
        }
        return JSON.stringify(result)
    }
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


