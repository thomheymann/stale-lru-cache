# Stale LRU Cache

[![Version](https://img.shields.io/npm/v/stale-lru-cache.svg)](https://www.npmjs.com/package/stale-lru-cache)
[![License](https://img.shields.io/npm/l/stale-lru-cache.svg)](https://www.npmjs.com/package/stale-lru-cache)
[![Build Status](https://travis-ci.org/cyberthom/stale-lru-cache.svg?branch=master)](https://travis-ci.org/cyberthom/stale-lru-cache)
[![Test Coverage](https://coveralls.io/repos/cyberthom/stale-lru-cache/badge.svg?branch=master&service=github)](https://coveralls.io/github/cyberthom/stale-lru-cache?branch=master)

A fork of [lru-cache](https://www.npmjs.com/package/lru-cache) that adds support for `stale-while-revalidate` cache control.

Comes with full support for non-string keys and values.


## Usage

#### Overview

```javascript
var LRU = require('stale-lru-cache');

var cache = LRU({
    max: 100,
    cacheControl: 'max-age=600, stale-while-revalidate=86400',
    revalidate: function (key, callback) {
        // ... after some async data fetching
        callback(null, 'new value');
    }
});

cache.set('key', { some: 'value' });
cache.get('key');

cache.set('another-key', 'another value', 'max-age=600, must-revalidate');
```

#### Helper

There is also a `wrap(key, revalidate, callback)` helper (inspired by [cache-manager](https://www.npmjs.com/package/cache-manager)) to simplify the most common use-cases:

```javascript
var LRU = require('stale-lru-cache');
var cache = LRU(100);

cache.wrap('key', function (callback) {
    // ... after some async data fetching
    callback(null, 'new value', 'max-age=600, stale-while-revalidate=86400');
}, function (error, value) {
    // Do something with value
});
```


## Options

* `max` - Maximum cache size (default: Infinity)

  Checked by applying the `length` function to all values in the cache. 

* `cacheControl` - Cache control string

  Use `max-age=<seconds>` to define when the item will expire.

  Combine with `stale-while-revalidate=<seconds>` to set the time window after `max-age` has expired in which the item is
  marked as stale but still usable. After both `max-age` and `stale-while-revalidate` have expired the item will be
  deleted from cache.

  Examples:

  * `no-cache, no-store, must-revalidate` - Will be dropped out of cache immediately
  * `max-age=600, must-revalidate` - Will be cached for 10 minutes and then dropped out of cache
  * `max-age=600, stale-while-revalidate=86400` - Will be cached for 10 minutes and then revalidated in the background if
    the item is accessed again within a time window of 1 day

* `revalidate` - Function used to fetch stale items

  Method has the following signature `function (key, callback)`. Its callback parameter should be called using: 
  `callback(error, value
  , [options])`.

* `length` - Function used to calculate the length of stored items

  If you're storing strings or buffers, then you probably want to do something like `function (n, key) { return n.length }`.
  The default is `function () { return 1 }`, which is fine if you want to store `max` like-sized things. The item is passed
  as the first argument, and the key is passed as the second argumnet.

* `dispose` - Function called on items when they are dropped from the cache

  This can be handy if you want to close file descriptors or do other cleanup tasks when items are no longer accessible.
  Called with `key, value`. It's called *before* actually removing the item from the internal cache, so if you want to
  immediately put it back in, you'll have to do that in a `nextTick` or `setTimeout` callback or it won't do anything.


## API

* `set(key, value, [options])`
* `get(key) => value`

  Both of these will update the "recently used"-ness of the key. They do what you think. `options` is optional and
  overrides the cache's default `cacheControl` and `revalidate` settings on a per-item basis. 

* `peek(key)`

  Returns the value without updating the "recently used"-ness of the key and without triggering the `revalidate` 
  function even if the item is stale.

  (If you find yourself using this a lot, you *might* be using the wrong sort of data structure, but there are some use
  cases where it's handy.)

* `del(key)`

  Deletes a key out of the cache.

* `reset()`

  Clear the cache entirely, throwing away all values.

* `has(key)`

  Check if a key is in the cache, without updating the recent-ness or deleting it for being stale.

* `isStale(key)`

  Check if an item has become stale (`max-age` expired). At this point any call to `get` will still return the cached value
  but kick off revalidation in the background.

* `isPastStale(key)`

  Check if an item has fully expired (`max-age` expired and `stale-while-revalidate` window has passed). At this point the item
  is deleted from cache.

* `wrap(key, revalidate, callback)`

  Helper that simplifies the most common use cases. This method first checks if an item identified by `key` is cached. If
  it is `callback` is called with that value, otherwise `revalidate` is used to get the data (e.g. by fetching from
  remote or reading from database). On success the item is cached and automatically revalidated when it becomes stale.

  `revalidate` method has the following signature: `function (callback)`. Its callback parameter should be called using: 
  `callback(error, value, [options])`.

  `callback` method has the following signature: `function (error, value)`

* `forEach(function(value, key, cache), [thisp])`

  Just like `Array.prototype.forEach`. Iterates over all the keys in the cache, in order of recent-ness. (Ie, more
  recently used items are iterated over first.)

* `rforEach(function(value, key, cache), [thisp])`

  The same as `cache.forEach(...)` but items are iterated over in reverse order. (ie, less recently used items are
  iterated over first.)

* `keys()`

  Return an array of the keys in the cache.

* `values()`

  Return an array of the values in the cache.

* `length()`

  Return total length of objects in cache taking into account `length` options function.

* `itemCount`

  Return total quantity of objects currently in cache. 
