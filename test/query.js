
var q = require('../query')
var tape = require('tape')

var line = 'condor,1.1.1,trackable-custom,,,,,,,,,,,,,,,,,ed-ab-share,articleUnitId:{articleUnitId}'

tape('create count query', function (t) {

  var reduce =  q.count('condor,1.1.1,trackable-custom,,,,,,,,,,,,,,,,,ed-ab-share,articleUnitId:{articleUnitId}')

  var line = 'condor,1.1.1,trackable-cusmom,,,,,,,,,,,,,,,,,ed-ab-share,articleUnitId:foo'
  var line2 = 'condor,1.1.1,trackable-cusmom,,,,,,,,,,,,,,,,,ed-ab-share,articleUnitId:bar'

  var value = reduce(null, line)
  t.deepEqual({foo: 1}, value)

  var value2 = reduce(value, line)
  t.deepEqual({foo: 2}, value)

  var value3 = reduce(value2, line2)
  t.deepEqual({foo: 2, bar: 1}, value)

  t.end()
})

tape('create stats query', function (t) {
  var reduce = q.stats('condor,1.1.0,end,,,,,{duration}')

  var line = '1411704587915,end,782,757,0,2300,http://url.com/foo,20300,date,240,,,,,,,,,,0'
  var line1 = '1411704587915,end,782,757,0,2300,http://url.com/foo,16300,date,240,,,,,,,,,,0'
  var line2 = '1411704587915,end,782,757,0,2300,http://url.com/foo,33300,date,240,,,,,,,,,,0'

  var value = reduce(null, line)
  t.equal(value.mean, 20300)

  var value1 = reduce(value, line1)
  t.equal(value.mean, 18300)

  var value2 = reduce(value1, line2)
  t.equal(value.mean, 23300)

  t.end()
})
