# Stale LRU Cache

[![Version](https://img.shields.io/npm/v/stale-lru-cache.svg)](https://www.npmjs.com/package/stale-lru-cache)
[![License](https://img.shields.io/npm/l/stale-lru-cache.svg)](https://www.npmjs.com/package/stale-lru-cache)
[![Build Status](https://travis-ci.org/cyberthom/stale-lru-cache.svg?branch=master)](https://travis-ci.org/cyberthom/stale-lru-cache)
[![Test Coverage](https://coveralls.io/repos/cyberthom/stale-lru-cache/badge.svg?branch=master&service=github)](https://coveralls.io/github/cyberthom/stale-lru-cache?branch=master)

In-memory cache for node.js with support for `max-age=<seconds>` and `stale-while-revalidate=<seconds>` Cache-Control headers.


## Overview

```javascript
var LRU = require('stale-lru-cache');

var cache = LRU({
    maxSize: 100,
    maxAge: 600,
    staleWhileRevalidate: 86400,
    revalidate: function (key, callback) {
        fetchSomeAsyncData(callback);
    }
});

cache.set('key', 'value', { maxAge: 60 }); // true
cache.get('key'); // 'value'
```


## Documentation

* [LRU (options)](#lru-options)
* [set (key, value, [options])](#set-key-value-options)
* [get (key)](#get-key)
* [has (key)](#has-key)
* [isStale (key)](#isstale-key)
* [wrap (key, revalidate, callback)](#wrap-key-revalidate-callback)
* [size](#size)

### LRU (options)

Instantiates a new LRU cache instance.

##### Parameters

* `options.maxAge` - Time from now (in seconds) after which items will expire (default: Infinity)
* `options.staleWhileRevalidate` - Time window (in seconds) after `maxAge` has expired in which items are marked as stale but still usable. After both
  `maxAge` and `staleWhileRevalidate` have expired items will be deleted from cache (default: 0)
* `options.revalidate (key, callback)` - Function that fetches stale items. `callback` takes the following parameters: `function (error, value, [options])`
* `options.maxSize` - Maximum cache size. Checked by applying the `getSize` options function to all values in the cache (default: Infinity)
* `options.getSize (value, key)` - Function used to calculate the length of stored items (default: `function () { return 1 }`)

---

### set (key, value, [options])

Sets the value for a key and marks it as most recently used. `options` can either be an object or a Cache-Control header string.

##### Parameters

* `key` - Cache key (can be a non-string)
* `value` - Cache value (can be a non-string)
* `options.maxAge` - Time from now (in seconds) after which items will expire
* `options.staleWhileRevalidate` - Time window (in seconds) after `maxAge` has expired in which items are marked as stale but still usable. After both
  `maxAge` and `staleWhileRevalidate` have expired items will be deleted from cache
* `options.revalidate (key, callback)` - Function used to fetch stale items

##### Examples

```javascript
cache.set('key', 'value'); // true
cache.set('key', 'value', { maxAge: 600, staleWhileRevalidate: 86400 }); // true
cache.set('key', 'value', { maxAge: 0 }); // false
cache.set('key', 'value', 'max-age=600, stale-while-revalidate=86400'); // true
```

---

### get (key)

Returns the cached value for a key and marks it as most recently used.

---

### has (key)

Checks if a key is in the cache, without marking it as recently used.

---

### isStale (key)

Checks if a key is in the cache and has been marked as stale, without marking it as recently used.

---

### wrap (key, revalidate, callback)

Helper that simplifies the most common use cases. 

If a key is in the cache `callback` will receive its value immediately. Otherwise `revalidate` is used to fetch it. On
success the item is cached and automatically revalidated when it becomes stale.

##### Parameters

* `key` - Cache key (can be a non-string)
* `revalidate (key, callback)` - Function that fetches stale items. `callback` takes the following parameters: `function (error, value, [options])`
* `callback (error, value)` - Function that recieves the cached value for a key

##### Examples

```javascript
cache.wrap('key', function (key, callback) {
    callback(null, 'new value', { maxAge: 600, staleWhileRevalidate: 86400 });
}, function (error, value) {
    // Do something with value
});
```

Using Cache-Control header from HTTP request:

```javascript
cache.wrap('key', function (key, callback) {
    request('http://www.google.com', function (error, response, html) {
        if (error) return callback(error);
        callback(null, html, response.headers['cache-control']);
    })
}, function (error, value) {
    // Do something with value
});
```

Behaviour of Cache-Control headers:

* `max-age=600, must-revalidate` - Will be cached for 10 minutes and then dropped out of cache
* `max-age=600, stale-while-revalidate=86400` - Will be cached for 10 minutes and then revalidated in the background if
  the item is accessed again within a time window of 1 day
* `no-cache, no-store, must-revalidate` - Will be dropped out of cache immediately
* `private` - Will be dropped out of cache immediately
* `public` - Will be cached using default `maxAge` and `staleWhileRevalidate` options values

---

### size

Size of all values in the cache taking into account `getSize` options function.


## Performance

Inserting 1,000,000 records on `node v4.2.1`:

| library                 | insert time | memory used |
| :---------------------- | :---------: | :---------: |
| `stale-lru-cache@5.0.0` | 10.213 ms   | 1.43 GB     |
| `fast-lru@3.0.1`        | 10.891 ms   | 1.36 GB     |
| `lru-cache@4.0.0`       | 11.128 ms   | 1.40 GB     |
| `node-cache@3.1.0`      | 17.575 ms   | 0.98 GB     |
