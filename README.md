# Stale LRU Cache

[![Version](https://img.shields.io/npm/v/stale-lru-cache.svg)](https://www.npmjs.com/package/stale-lru-cache)
[![License](https://img.shields.io/npm/l/stale-lru-cache.svg)](https://www.npmjs.com/package/stale-lru-cache)
[![Build Status](https://travis-ci.org/cyberthom/stale-lru-cache.svg?branch=master)](https://travis-ci.org/cyberthom/stale-lru-cache)
[![Test Coverage](https://coveralls.io/repos/cyberthom/stale-lru-cache/badge.svg?branch=master&service=github)](https://coveralls.io/github/cyberthom/stale-lru-cache?branch=master)

Resilient and performant in-memory cache for node.js.

##### Features

* Hides refresh latency and shields against errors using background fetching 
* Allows HTTP resources to define their own caching policy using Cache-Control headers
* Optimises hit-ratio by discarding least recently used items first


## Overview

##### Installation

```
npm install --save stale-lru-cache
```

##### Basic Usage

```javascript
var Cache = require('stale-lru-cache');

var cache = Cache({
    maxSize: 100,
    maxAge: 600,
    staleWhileRevalidate: 86400,
    revalidate: function (key, callback) {
        fetchSomeAsyncData(callback);
    }
});

cache.set('key', 'value'); // true
cache.get('key'); // 'value'
```

##### HTTP Request Caching

```javascript
cache.wrap('google', function (key, callback) {
    request('http://www.google.com', function (error, response, html) {
        if (error) return callback(error);
        callback(null, html, response.headers['cache-control']);
    })
}, function (error, value) {
    // Do something with cached value
});
```


## Reference

* [`Cache()`](#lru-options)
* [`.delete()`](#delete-key)
* [`.get()`](#get-key)
* [`.has()`](#has-key)
* [`.isStale()`](#isstale-key)
* [`.keys()`](#keys)
* [`.set()`](#set-key-value-options)
* [`.size`](#size)
* [`.values()`](#values)
* [`.wrap()`](#wrap-key-revalidate-callback)


### `Cache(options)`

Creates and returns a new Cache instance.

##### Parameters

* `options.maxAge` - Time in seconds after which items will expire. *(default: Infinity)*
* `options.staleWhileRevalidate` - Time in seconds, after `maxAge` has expired, when items are marked as stale but still usable. *(default: 0)*
* `options.revalidate(key, callback(error, value, [options]))` - Function that refreshes items in the background after they become stale.
* `options.maxSize` - Maximum cache size. *(default: Infinity)*
* `options.getSize(value, key)` - Function used to calculate the length of each stored item. *(default: 1)*

---

### `delete(key)`

Removes the specified item from the cache. 

Returns `true` if an item existed and has been removed, or `false` if the item does not exist.

---

### `get(key)`

Returns the value associated with the specified key, or `undefined` if the item does not exist.

---

### `has(key)`

Returns `true` if an item with the specified key exists (may be fresh or stale), or `false` otherwise.

---

### `isStale(key)`

Returns `true` if an item with the specified key exists and is stale, or `false` otherwise.

---

### `keys()`

Returns an array with all keys stored in the cache.

---

### `set(key, value, [options])`

Inserts a new item with the specified `key` and `value`. 

Returns `true` if the item has been inserted, or `false` otherwise. 

##### Parameters

* `key` - **Required.** The key of the item to be inserted. (both objects and primitives may be used)
* `value` - **Required.** The value of the item to be inserted. (both objects and primitives may be used)
* `options` - Item specific Cache-Control string or options object.
* `options.maxAge` - Time in seconds after which the item will expire.
* `options.staleWhileRevalidate` - Time in seconds, after `maxAge` has expired, when the item is marked as stale but still usable.
* `options.revalidate(key, callback(error, value, [options]))` - Function that refreshes the item in the background after it becomes stale.

##### Examples

```javascript
cache.set('key', 'value'); // true

cache.set('key', 'value', { maxAge: 600, staleWhileRevalidate: 86400 }); // true
cache.set('key', 'value', { maxAge: 0 }); // false

cache.set('key', 'value', 'max-age=600, stale-while-revalidate=86400'); // true
cache.set('key', 'value', 'no-cache, no-store, must-revalidate'); // false
```

##### Cache-Control Behaviour

* `max-age=600, must-revalidate` - Will be cached for 10 minutes and removed afterwards
* `max-age=600, stale-while-revalidate=86400` - Will be cached for 10 minutes and then refreshed in the background if the item is accessed again within a time window of 1 day
* `no-cache, no-store, must-revalidate` - Will not be cached
* `private` - Will not be cached
* `public` - Will be cached using default `maxAge` and `staleWhileRevalidate` options

---

### `size`

Property indicating the size of all stored items in the cache. This is calculated using `getSize` options function.

---

### `values()`

Returns an array with all values stored in the cache.

---

### `wrap(key, revalidate, callback)`

Helper that simplifies the most common use cases.

If an item with the specified key exists `callback` will receive its value immediately. Otherwise `revalidate` is used
to fetch the initial value. If successful the item is cached and automatically revalidated when it becomes stale.

##### Parameters

* `key` - **Required.** The key of the item to be wrapped. (both objects and primitives may be used)
* `revalidate(key, callback(error, value, [options]))` - **Required.** Function that gets the initial value and refreshes the item in the background after it becomes stale.
* `callback(error, value)` - **Required.** Function that recieves the cached value of the wrapped item.

##### Example

```javascript
cache.wrap('key', function (key, callback) {
    // After some async operation to fetch value:
    callback(null, value, 'max-age=600, stale-while-revalidate=86400');
}, function (error, value) {
    // Do something with cached value
});
```


## Performance

Inserting 1,000,000 records:

| Module                  |      Duration |  Memory Usage |         More       |
| :---------------------- | ------------: | ------------: | :----------------: |
| `stale-lru-cache@5.0.0` |      6,452 ms |       0.40 GB | [Full Results][01] |
| `fast-lru@3.0.1`        |      7,877 ms |       0.31 GB | [Full Results][02] |
| `lru-cache@4.0.0`       |      8,151 ms |       0.43 GB | [Full Results][03] |
| `node-cache@3.1.0`      |     11,450 ms |       0.71 GB | [Full Results][04] |
| `lru-cache@3.2.0`       |    100,000 ms |      *killed* | [Full Results][05] |
| `storage-lru@0.1.1`     |    100,000 ms |      *killed* | [Full Results][06] |

Reading 1,000,000 records:

| Module                  |      Duration |         More       |
| :---------------------- | ------------: | :----------------: |
| `lru-cache@4.0.0`       |        279 ms | [Full Results][07] |
| `stale-lru-cache@5.0.0` |        331 ms | [Full Results][08] |
| `fast-lru@3.0.1`        |        455 ms | [Full Results][09] |
| `node-cache@3.1.0`      |      1,940 ms | [Full Results][10] |
| `storage-lru@0.1.1`     |     20,612 ms | [Full Results][11] |
| `lru-cache@3.2.0`       |     48,593 ms | [Full Results][12] |

Tested on `node v4.2.1`.

[01]: https://github.com/cyberthom/stale-lru-cache/blob/master/benchmark/results/stale-lru-cache@latest--insert-time.tsv
[02]: https://github.com/cyberthom/stale-lru-cache/blob/master/benchmark/results/fast-lru@3.0.1--insert-time.tsv
[03]: https://github.com/cyberthom/stale-lru-cache/blob/master/benchmark/results/lru-cache@4.0.0--insert-time.tsv
[04]: https://github.com/cyberthom/stale-lru-cache/blob/master/benchmark/results/node-cache@3.1.0--insert-time.tsv
[05]: https://github.com/cyberthom/stale-lru-cache/blob/master/benchmark/results/lru-cache@3.2.0--insert-time.tsv
[06]: https://github.com/cyberthom/stale-lru-cache/blob/master/benchmark/results/storage-lru@0.1.1--insert-time.tsv

[07]: https://github.com/cyberthom/stale-lru-cache/blob/master/benchmark/results/stale-lru-cache@latest--read-time.tsv
[08]: https://github.com/cyberthom/stale-lru-cache/blob/master/benchmark/results/fast-lru@3.0.1--read-time.tsv
[09]: https://github.com/cyberthom/stale-lru-cache/blob/master/benchmark/results/lru-cache@4.0.0--read-time.tsv
[10]: https://github.com/cyberthom/stale-lru-cache/blob/master/benchmark/results/node-cache@3.1.0--read-time.tsv
[11]: https://github.com/cyberthom/stale-lru-cache/blob/master/benchmark/results/lru-cache@3.2.0--read-time.tsv
[12]: https://github.com/cyberthom/stale-lru-cache/blob/master/benchmark/results/storage-lru@0.1.1--read-time.tsv
