var DoublyLinkedList = require('yallist');

function StaleLRU(options) {
    if (!(this instanceof StaleLRU)) {
        return new StaleLRU(options);
    }

    if (typeof options === 'number') {
        options = { maxSize: options };
    } else if (!options) {
        options = {};
    }

    this._maxSize = options.max || options.maximumSize || options.maxSize;
    this._getSize = options.length || options.getSize || simpleSize;
    this._maxAge = (typeof options.maxAge === 'number') ? options.maxAge : Infinity;
    this._staleWhileRevalidate = (typeof options.staleWhileRevalidate === 'number') ? options.staleWhileRevalidate : 0;
    this._revalidate = options.revalidate;
    this._callbackQueue = new Map(); // Holds revalidate callbacks

    this.reset();
}

StaleLRU.prototype.reset = function() {
    this._lruList = new DoublyLinkedList(); // Holds cache items in order of recent-ness
    this._map = new Map(); // Maps cache keys to LRU list nodes
    this._size = 0;
}

Object.defineProperty(StaleLRU.prototype, 'size', {
    get: function () { return this._size; }
});

Object.defineProperty(StaleLRU.prototype, 'maxSize', {
    get: function () { return this._maxSize; }
});

StaleLRU.prototype.has = function (key) {
    var node = this._map.get(key);
    if (node) {
        var item = node.value;
        return !isPastStale(this, item);
    }
    return false;
}

StaleLRU.prototype.isStale = function (key) {
    var node = this._map.get(key);
    if (node) {
        var item = node.value;
        return isStale(this, item);
    }
    return false;
}

StaleLRU.prototype.get = function (key) {
    var node = this._map.get(key);
    if (node) {
        var item = node.value;
        if (!isPastStale(this, item)) {
            this._lruList.unshiftNode(node);
            if (isStale(this, item)) revalidate(this, item);
            return item.value;
        } else {
            del(this, node);
        }
    }
}

StaleLRU.prototype.set = function (key, value, options) {
    if (typeof options === 'string') {
        options = parseCacheControl(options);
    } else if (!options) {
        options = {};
    }
    var now = Date.now();
    var size = this._getSize(value, key);
    var node = this._map.get(key);
    var item;

    if (node) {
        item = node.value;

        // Have it but will not make it in
        if (size > this.maxSize) {
            del(this, node);
            return false;
        }

        // Have it and will make it in
        item.now = now;
        item.maxAge = options.maxAge;
        item.staleWhileRevalidate = options.staleWhileRevalidate;

        if (isPastStale(this, item)) {
            del(this, node);
            return false;
        }

        if (options.revalidate) {
            item.revalidate = options.revalidate;
        }
        item.value = value;
        this._size += size - item.size;
        item.size = size;

        this._lruList.unshiftNode(node);
        trim(this);

        return true;
    }

    // Do not have it and will not make it in
    if (size > this.maxSize) {
        return false;
    }

    // Do not have it but will make it in
    item = new Item(key, value, size, now, options.maxAge, options.staleWhileRevalidate, options.revalidate);

    if (isPastStale(this, item)) {
        return false;
    }

    this._size += size;

    this._lruList.unshift(item);
    this._map.set(key, this._lruList.head);
    trim(this);

    return true;
}

StaleLRU.prototype.delete = function (key) {
    var node = this._map.get(key);
    if (node) {
        del(this, node);
        return true;
    }
    return false;
}

StaleLRU.prototype.keys = function () {
    return this._lruList.toArray().map(function (item) { return item.key; }, this);
}

StaleLRU.prototype.values = function () {
    return this._lruList.toArray().map(function (item) { return item.value; }, this);
}

StaleLRU.prototype.wrap = function (key, work, callback) {
    var self = this;
    if (self.has(key)) {
        callback(null, self.get(key));
        return;
    }

    if (self._callbackQueue.has(key)) {
        self._callbackQueue.get(key).push(callback);
        return;
    }
    self._callbackQueue.set(key, [callback]);

    work(key, fulfillQueue);

    function fulfillQueue(error, value, options) {
        if (typeof options === 'string') {
            options = parseCacheControl(options);
        } else if (!options) {
            options = {};
        }
        options.revalidate || (options.revalidate = work);
        if (!error) self.set(key, value, options);
        var callbacks = self._callbackQueue.get(key);
        self._callbackQueue.delete(key);
        for (var i = 0; i < callbacks.length; i++) {
            var done = callbacks[i];
            done(error, value);
        }
    }
}

function isStale(self, item) {
    var maxAge = (typeof item.maxAge === 'number') ? item.maxAge : self._maxAge;
    var staleWhileRevalidate = (typeof item.staleWhileRevalidate === 'number') ? item.staleWhileRevalidate : self._staleWhileRevalidate;
    var now = Date.now();
    var expires = item.now + maxAge * 1000;
    return (expires <= now) && (now < expires + staleWhileRevalidate * 1000);
}

function isPastStale(self, item) {
    var maxAge = (typeof item.maxAge === 'number') ? item.maxAge : self._maxAge;
    var staleWhileRevalidate = (typeof item.staleWhileRevalidate === 'number') ? item.staleWhileRevalidate : self._staleWhileRevalidate;
    return (item.now + maxAge * 1000 + staleWhileRevalidate * 1000) <= Date.now();
}

function revalidate(self, item) {
    var key = item.key;
    var work = item.revalidate || self._revalidate;
    if (!work) return;

    if (self._callbackQueue.has(key)) return;
    self._callbackQueue.set(key, []);

    work(key, fulfillQueue);

    function fulfillQueue(error, value, options) {
        if (!error) self.set(key, value, options);
        var callbacks = self._callbackQueue.get(key);
        self._callbackQueue.delete(key);
        for (var i = 0; i < callbacks.length; i++) {
            var done = callbacks[i];
            done(error, value);
        }
    }
}

function trim(self) {
    if (self._size > self._maxSize) {
        for (var node = self._lruList.tail; self._size > self._maxSize && node !== null;) {
            var prev = node.prev;
            del(self, node);
            node = prev;
        }
    }
}

function del(self, node) {
    var item = node.value;
    self._size -= item.size;
    self._map.delete(item.key);
    self._lruList.removeNode(node);
}

module.exports = StaleLRU;


function Item(key, value, size, now, maxAge, staleWhileRevalidate, revalidate) {
    this.key = key;
    this.value = value;
    this.size = size;
    this.now = now;
    this.maxAge = maxAge;
    this.staleWhileRevalidate = staleWhileRevalidate;
    this.revalidate = revalidate;
}

function simpleSize() {
    return 1;
}

// Ain't pretty but is fast - Parsing 3,000,000 cache-control headers on node v4.2.1:
//
// substr: 1,038 ms (below)
// split: 2,435 ms (https://github.com/yahoo/storage-lru/blob/master/src/StorageLRU.js#L601)
// regex: 9,691 ms (https://github.com/roryf/parse-cache-control/blob/master/index.js#L15)
function parseCacheControl(header) {
    var options = {};
    if (header) {
        header = header.toLowerCase();
        if (header.indexOf('no-cache') !== -1 || header.indexOf('no-store') !== -1 || header.indexOf('private') !== -1) {
            options.maxAge = 0;
            options.staleWhileRevalidate = 0;
        } else {
            var pos, seconds;

            pos = header.indexOf('max-age=');
            seconds = (pos !== -1) ? parseInt(header.substr(pos + 8), 10) : NaN;
            if (seconds >= 0) options.maxAge = seconds;

            pos = header.indexOf('stale-while-revalidate=');
            seconds = (pos !== -1) ? parseInt(header.substr(pos + 23), 10) : NaN;
            if (seconds >= 0) options.staleWhileRevalidate = seconds;
        }
    }
    return options;
}
