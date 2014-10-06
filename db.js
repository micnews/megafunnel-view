

var config = require('./config')

var TimeBucketReduce = require('time-bucket-reduce')

module.exports = function (db, request) {

  var queue = []
  var latest = 0
  var writing = false

  function drain () {

    if(queue.length === 1000 && !writing) {
      writing = true
      queue.unshift({
        key: 'seq', value: latest, type: 'put'
      })
      var _queue = queue
      queue = []

      db.batch(queue, function (err) {
        //crash... it isn't end of the world, because
        //this is just a deterministically generated view.
        if(err)
          throw err
        writing = false
        drain()
      })
    }

  }

  function push (item) {
    latest = Math.max(item.ts, latest)
    queue.push(item)

    //also check for a timed delay?
  }

  function reconnect () {

    var stream = request(initial)

    var TBR = TimeBucketReduce({
      map:
      reduce:
      output: function (value, start, type) {

        push({
          key: [query, type, start], value value, 
          ts: start, type: 'put'
        })

      }
    })

    pull(
      toPull.source(stream),
      split(),
      pull.map(csvLine.decode),
      pull.drain(TBR)
    )

  }

  reconnect()
}
