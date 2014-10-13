var r = require('./reduce')
var legacy = require('./legacy')

/*
//count, group by a column.
{
  //<filter key>: <literal match>,
  foo: 'bar'
  //<target key>: <pattern>
  match: 'foo{bar}' //matches foobar, foobaz, fooblurg, fooetc.
}

//


*/

function isString(s) {
  return 'string' === typeof s
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
    var target
    for(var key in rule) {
      var rvalue = rule[key]
      var value = data[key]
      if(isString(rvalue)) {
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


