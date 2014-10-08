# megafunnel-view

aggregate views on top of megafunnel

## Example

``` js
var megaview = require('megafunnel-view')({megaHost: host})

megaview.addCount('clicks',
  'condor,,trackable-click,,,,,,,,,,,,,,,,,ed-ab,articleId:{articleId}'
)

//get the count of all clicks, by hour.
megaview.query('clicks', {period: 'Hours'})

```

or via http api

``` bash
# start the view server
megafunnel-view &

# request data over http!
curl "$HOST:$PORT/query/clicks&period=Hours"
```

## License

MIT
