# megafunnel-view

aggregate views on top of megafunnel

## Example

add a `views` section to megafunnel config file,
(this query will work with the default [condor](https://github.com/micnews/condor)
which is hosted by megafunnel)

``` js
{
  "views": {
    "clicks": {
      "count": {
        eventName: 'click',
        href: true
      }
    }
  }
}
```

Start the `megafunnel-view` server, it uses the same config file
as [megafunnel](https://github.com/micnews/megafunnel)

``` bash
# start the view server
megafunnel-view
```
Now, assuming there is some data already in megafunnel,
(see the megafunnel documentation get started), request
the view over http:

``` js
# request data over http!
curl "$HOST:$PORT/query/clicks&period=Minutes"
```

## http api

### GET /view/{name}?period={Minutes,Hours,Date,FullYear}

period is the only mandatory option. the value must be a valid
[time-period](https://github.com/micnews/time-period)

also, a range may be passed.
Any valid [level range](https://github.com/dominictarr/ltgt#ways-to-specify-ranges)
may be passed. I suggest using only `lt, gt, lte, gte` ranges

The values can be any valid string for `new Date(string)` including a timestamp
(i.e. `+new Date()`)

By default, the response will be valid json, to get line delimited json,
use the option `&lines=true`.

To get a realtime feed, use `&tail=true`. You can parse streaming json
with [JSONStream](https://github.com/dominictarr/JSONStream) although using
line delimited json is more performant.

### GET /state/{name}

Get a snapshot of the current state of this query. This returns the current
values for each [period](https://github.com/dominictarr/time-period)

### GET /state

get a snapshot for all queries.

## License

MIT
