var csvLine = require('csv-line')

module.exports = function (string) {
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



