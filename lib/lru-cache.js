module.exports = LRUCache

// This will be a proper iterable 'Map' in engines that support it,
// or a fakey-fake PseudoMap in older versions.
var Map = require('pseudomap')
var parseCacheControl = require('parse-cache-control');

function naiveLength () { return 1 }

function LRUCache (options) {
  if (!(this instanceof LRUCache))
    return new LRUCache(options)

  if (typeof options === 'number')
    options = { max: options }

  options = parseOptions(options);

  this._max = options.max
  // Kind of weird to have a default max of Infinity, but oh well.
  if (!this._max || !(typeof this._max === "number") || this._max <= 0 )
    this._max = Infinity

  this._lengthCalculator = options.length || naiveLength
  if (typeof this._lengthCalculator !== "function")
    this._lengthCalculator = naiveLength

  this._maxAge = (typeof options.maxAge === 'number') ? options.maxAge : null
  this._staleWhileRevalidate = (typeof options.staleWhileRevalidate === 'number') ? options.staleWhileRevalidate : 0
  this._revalidate = options.revalidate
  this._dispose = options.dispose
  this._queue = new Map();
  this.reset()

  this.wrap = this.wrap.bind(this);
}

function parseOptions(options) {
  if (!options) return {};
  if (typeof options === 'string') {
    options = { cacheControl: options };
  }
  if ('cacheControl' in options) {
    var cacheControl = parseCacheControl(options.cacheControl);
    if (cacheControl) {
      options.maxAge = parseInt(cacheControl['max-age'], 10) || 0;
      options.staleWhileRevalidate = parseInt(cacheControl['stale-while-revalidate'], 10) || 0;
    }
    delete options.cacheControl;
  }
  return options;
}

// resize the cache when the max changes.
Object.defineProperty(LRUCache.prototype, "max",
  { set : function (mL) {
      if (!mL || !(typeof mL === "number") || mL <= 0 ) mL = Infinity
      this._max = mL
      if (this._length > this._max) trim(this)
    }
  , get : function () { return this._max }
  , enumerable : true
  })

// resize the cache when the lengthCalculator changes.
Object.defineProperty(LRUCache.prototype, "lengthCalculator",
  { set : function (lC) {
      if (typeof lC !== "function") {
        this._lengthCalculator = naiveLength
        this._length = this._lruList.size
        this._cache.forEach(function (value, key) {
          value.length = 1
        })
      } else {
        this._lengthCalculator = lC
        this._length = 0
        this._cache.forEach(function (value, key) {
          value.length = this._lengthCalculator(value.value, key)
          this._length += value.length
        }, this)
      }

      if (this._length > this._max) trim(this)
    }
  , get : function () { return this._lengthCalculator }
  , enumerable : true
  })

Object.defineProperty(LRUCache.prototype, "length",
  { get : function () { return this._length }
  , enumerable : true
  })

Object.defineProperty(LRUCache.prototype, "itemCount",
  { get : function () { return this._lruList.size }
  , enumerable : true
  })

function reverseKeys (map) {
  // keys live in lruList map in insertion order.
  // we want them in reverse insertion order.
  // flip the list of keys.
  var itemCount = map.size
  var keys = new Array(itemCount)
  var i = itemCount
  map.forEach(function (value, key) {
    keys[--i] = key
  })

  return keys
}

LRUCache.prototype.rforEach = function (fn, thisp) {
  thisp = thisp || this
  this._lruList.forEach(function (hit) {
    forEachStep(this, fn, hit, thisp)
  }, this)
}

function forEachStep (self, fn, hit, thisp) {
  if (!hit) return;
  if (isPastStale(self, hit)) {
    del(self, hit);
    return;
  }
  if (isStale(self, hit)) revalidate(self, hit);
  fn.call(thisp, hit.value, hit.key, self)
}


LRUCache.prototype.forEach = function (fn, thisp) {
  thisp = thisp || this

  var keys = reverseKeys(this._lruList)
  for (var k = 0; k < keys.length; k++) {
    var hit = this._lruList.get(keys[k])
    forEachStep(this, fn, hit, thisp)
  }
}

LRUCache.prototype.keys = function () {
  return reverseKeys(this._lruList).map(function (k) {
    return this._lruList.get(k).key
  }, this)
}

LRUCache.prototype.values = function () {
  return reverseKeys(this._lruList).map(function (k) {
    return this._lruList.get(k).value
  }, this)
}

LRUCache.prototype.reset = function () {
  if (this._dispose && this._cache) {
    this._cache.forEach(function (entry, key) {
      this._dispose(key, entry.value)
    }, this)
  }

  this._cache = new Map() // hash of items by key
  this._lruList = new Map() // list of items in order of use recency
  this._mru = 0 // most recently used
  this._lru = 0 // least recently used
  this._length = 0 // number of items in the list
}

LRUCache.prototype.dumpLru = function () {
  return this._lruList
}

LRUCache.prototype.set = function (key, value, options) {
  options = parseOptions(options);

  var now = Date.now()
  var len = this._lengthCalculator(value, key)
  var maxAge = options.maxAge;
  var staleWhileRevalidate = options.staleWhileRevalidate;
  var revalidate = options.revalidate

  if (this._cache.has(key)) {
    if (len > this._max) {
      del(this, this._cache.get(key))
      return false
    }

    var item = this._cache.get(key)

    // dispose of the old one before overwriting
    if (this._dispose)
      this._dispose(key, item.value)

    item.now = now
    item.value = value
    this._length += (len - item.length)
    item.length = len
    if (typeof maxAge !== 'undefined') item.maxAge = maxAge
    if (typeof staleWhileRevalidate !== 'undefined') item.staleWhileRevalidate = staleWhileRevalidate
    if (typeof revalidate !== 'undefined') item.revalidate = revalidate
    this.get(key)

    if (this._length > this._max)
      trim(this)

    return true
  }

  var hit = new Entry(key, value, this._mru, len, now, maxAge, staleWhileRevalidate, revalidate)
  incMru(this)

  // oversized and expired objects fall out of cache automatically.
  if (hit.length > this._max || isPastStale(this, hit)) {
    if (this._dispose) this._dispose(key, value)
    return false
  }

  this._length += hit.length
  this._cache.set(key, hit)
  this._lruList.set(hit.lu, hit)

  if (this._length > this._max)
    trim(this)

  return true
}

LRUCache.prototype.has = function (key) {
  if (!this._cache.has(key)) return false
  var hit = this._cache.get(key)
  if (isPastStale(this, hit)) {
    return false
  }
  return true
}

LRUCache.prototype.get = function (key) {
  return get(this, key, true)
}

LRUCache.prototype.peek = function (key) {
  return get(this, key, false)
}

LRUCache.prototype.isStale = function (key) {
  var hit = this._cache.get(key)
  return isStale(this, hit)
}

LRUCache.prototype.isPastStale = function (key) {
  var hit = this._cache.get(key)
  return isPastStale(this, hit)
}

LRUCache.prototype.pop = function () {
  var hit = this._lruList.get(this._lru)
  del(this, hit)
  return hit || null
}

LRUCache.prototype.del = function (key) {
  del(this, this._cache.get(key))
}

LRUCache.prototype.wrap = function (key, work, callback) {
  var self = this;
  if (self.has(key)) return callback(null, self.get(key));

  if (self._queue.has(key)) return self._queue.get(key).push(callback);
  self._queue.set(key, [callback]);

  work(fulfillQueue);

  function fulfillQueue(error, result, options) {
    options = parseOptions(options);
    options.revalidate || (options.revalidate = work);
    if (!error) self.set(key, result, options);
    self._queue.get(key).forEach(function (done) {
      done(error, result);
    });
    self._queue.delete(key);
  }
}

function revalidate(self, hit) {
  if (!hit) return;
  var work = hit.revalidate || self._revalidate;
  if (!work) return;
  var key = hit.key;

  if (self._queue.has(key)) return;
  self._queue.set(key, []);

  if (self._revalidate !== work) {
    work(fulfillQueue);
  } else {
    work(key, fulfillQueue);
  }

  function fulfillQueue(error, value, options) {
    if (!error) self.set(key, value, options);
    self._queue.get(key).forEach(function (done) {
      done(error, result);
    });
    self._queue.delete(key);
  }
}

function isStale(self, hit) {
  if (isPastStale(self, hit)) return false;
  if (!hit) return false;
  var maxAge = (typeof hit.maxAge === 'number') ? hit.maxAge : self._maxAge;
  if (typeof maxAge !== 'number') return false;
  return (hit.now + maxAge * 1000) <= Date.now();
}

function isPastStale(self, hit) {
  if (!hit) return false;
  var maxAge = (typeof hit.maxAge === 'number') ? hit.maxAge : self._maxAge;
  if (typeof maxAge !== 'number') return false;
  var staleWhileRevalidate = (typeof hit.staleWhileRevalidate === 'number') ? hit.staleWhileRevalidate : (typeof self._staleWhileRevalidate === 'number') ? self._staleWhileRevalidate : 0;
  return (hit.now + maxAge * 1000 + staleWhileRevalidate * 1000) <= Date.now();
}

function get(self, key, doUse) {
  var hit = self._cache.get(key);
  if (!hit) return;
  if (isPastStale(self, hit)) {
    del(self, hit);
    return;
  }
  if (doUse) {
    use(self, hit);
    if (isStale(self, hit)) revalidate(self, hit);
  }
  return hit.value;
}

function use (self, hit) {
  shiftLU(self, hit)
  hit.lu = self._mru
  incMru(self)
  self._lruList.set(hit.lu, hit)
}

function trim (self) {
  if (self._length > self._max) {
    var keys = reverseKeys(self._lruList)
    for (var k = keys.length - 1; self._length > self._max; k--) {
      // We know that we're about to delete this one, and also
      // what the next least recently used key will be, so just
      // go ahead and set it now.
      self._lru = keys[k - 1]
      del(self, self._lruList.get(keys[k]))
    }
  }
}

function shiftLU (self, hit) {
  self._lruList.delete(hit.lu)
  if (hit.lu === self._lru)
    self._lru = reverseKeys(self._lruList).pop()
}

function del (self, hit) {
  if (hit) {
    if (self._dispose) self._dispose(hit.key, hit.value)
    self._length -= hit.length
    self._cache.delete(hit.key)
    shiftLU(self, hit)
  }
}

// classy, since V8 prefers predictable objects.
function Entry (key, value, lu, length, now, maxAge, staleWhileRevalidate, revalidate) {
  this.key = key
  this.value = value
  this.lu = lu
  this.length = length
  this.now = now
  this.maxAge = maxAge
  this.staleWhileRevalidate = staleWhileRevalidate
  this.revalidate = revalidate
}


// Incrementers and decrementers that loop at MAX_SAFE_INTEGER
// only relevant for the lu, lru, and mru counters, since they
// get touched a lot and can get very large. Also, since they
// only go upwards, and the sets will tend to be much smaller than
// the max, we can very well assume that a very small number comes
// after a very large number, rather than before it.
var maxSafeInt = Number.MAX_SAFE_INTEGER || 9007199254740991
function intInc (number) {
  return (number === maxSafeInt) ? 0 : number + 1
}
function incMru (self) {
  do {
    self._mru = intInc(self._mru)
  } while (self._lruList.has(self._mru))
}
