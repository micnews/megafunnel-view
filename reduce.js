function isNumber(n) {
  return !isNaN(n)
}

function count (a, b) {
  if(!a) a = isNumber(b) ? 0 : {}

  //treat b as the key
  if('string' === typeof b)
    a[b] = (a[b] || 0) + 1
  else if('object' == typeof b) {
    for(var k in b) {
      a[k] = (a[k] || 0) + b[k]
    }
  }
  else if(isNumber(b))
    return a + b
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

exports.count = count
exports.stats = stats

