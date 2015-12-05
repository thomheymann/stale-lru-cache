var test = require("tap").test
  , LRU = require("../")

test("basic", function (t) {
  var cache = new LRU({max: 10})
  cache.set("key", "value")
  t.equal(cache.get("key"), "value")
  t.equal(cache.get("nada"), undefined)
  t.equal(cache.length, 1)
  t.equal(cache.max, 10)
  t.end()
})

test("least recently set", function (t) {
  var cache = new LRU(2)
  cache.set("a", "A")
  cache.set("b", "B")
  cache.set("c", "C")
  t.equal(cache.get("c"), "C")
  t.equal(cache.get("b"), "B")
  t.equal(cache.get("a"), undefined)
  t.end()
})

test("lru recently gotten", function (t) {
  var cache = new LRU(2)
  cache.set("a", "A")
  cache.set("b", "B")
  cache.get("a")
  cache.set("c", "C")
  t.equal(cache.get("c"), "C")
  t.equal(cache.get("b"), undefined)
  t.equal(cache.get("a"), "A")
  t.end()
})

test("del", function (t) {
  var cache = new LRU(2)
  cache.set("a", "A")
  cache.del("a")
  t.equal(cache.get("a"), undefined)
  t.end()
})

test("max", function (t) {
  var cache = new LRU(3)

  // test changing the max, verify that the LRU items get dropped.
  cache.max = 100
  for (var i = 0; i < 100; i ++) cache.set(i, i)
  t.equal(cache.length, 100)
  for (var i = 0; i < 100; i ++) {
    t.equal(cache.get(i), i)
  }
  cache.max = 3
  t.equal(cache.length, 3)
  for (var i = 0; i < 97; i ++) {
    t.equal(cache.get(i), undefined)
  }
  for (var i = 98; i < 100; i ++) {
    t.equal(cache.get(i), i)
  }

  // now remove the max restriction, and try again.
  cache.max = "hello"
  for (var i = 0; i < 100; i ++) cache.set(i, i)
  t.equal(cache.length, 100)
  for (var i = 0; i < 100; i ++) {
    t.equal(cache.get(i), i)
  }
  // should trigger an immediate resize
  cache.max = 3
  t.equal(cache.length, 3)
  for (var i = 0; i < 97; i ++) {
    t.equal(cache.get(i), undefined)
  }
  for (var i = 98; i < 100; i ++) {
    t.equal(cache.get(i), i)
  }
  t.end()
})

test("reset", function (t) {
  var cache = new LRU(10)
  cache.set("a", "A")
  cache.set("b", "B")
  cache.reset()
  t.equal(cache.length, 0)
  t.equal(cache.max, 10)
  t.equal(cache.get("a"), undefined)
  t.equal(cache.get("b"), undefined)
  t.end()
})


test("basic with weighed length", function (t) {
  var cache = new LRU({
    max: 100,
    length: function (item, key) {
      t.isa(key, 'string')
      return item.size
    }
  })
  cache.set("key", {val: "value", size: 50})
  t.equal(cache.get("key").val, "value")
  t.equal(cache.get("nada"), undefined)
  t.equal(cache.lengthCalculator(cache.get("key"), 'key'), 50)
  t.equal(cache.length, 50)
  t.equal(cache.max, 100)
  t.end()
})


test("weighed length item too large", function (t) {
  var cache = new LRU({
    max: 10,
    length: function (item) { return item.size }
  })
  t.equal(cache.max, 10)

  // should fall out immediately
  cache.set("key", {val: "value", size: 50})

  t.equal(cache.length, 0)
  t.equal(cache.get("key"), undefined)
  t.end()
})

test("least recently set with weighed length", function (t) {
  var cache = new LRU({
    max:8,
    length: function (item) { return item.length }
  })
  cache.set("a", "A")
  cache.set("b", "BB")
  cache.set("c", "CCC")
  cache.set("d", "DDDD")
  t.equal(cache.get("d"), "DDDD")
  t.equal(cache.get("c"), "CCC")
  t.equal(cache.get("b"), undefined)
  t.equal(cache.get("a"), undefined)
  t.end()
})

test("lru recently gotten with weighed length", function (t) {
  var cache = new LRU({
    max: 8,
    length: function (item) { return item.length }
  })
  cache.set("a", "A")
  cache.set("b", "BB")
  cache.set("c", "CCC")
  cache.get("a")
  cache.get("b")
  cache.set("d", "DDDD")
  t.equal(cache.get("c"), undefined)
  t.equal(cache.get("d"), "DDDD")
  t.equal(cache.get("b"), "BB")
  t.equal(cache.get("a"), "A")
  t.end()
})

test("lru recently updated with weighed length", function (t) {
  var cache = new LRU({
    max: 8,
    length: function (item) { return item.length }
  })
  cache.set("a", "A")
  cache.set("b", "BB")
  cache.set("c", "CCC")
  t.equal(cache.length, 6) //CCC BB A
  cache.set("a", "+A")
  t.equal(cache.length, 7) //+A CCC BB
  cache.set("b", "++BB")
  t.equal(cache.length, 6) //++BB +A
  t.equal(cache.get("c"), undefined)

  cache.set("c", "oversized")
  t.equal(cache.length, 6) //++BB +A
  t.equal(cache.get("c"), undefined)

  cache.set("a", "oversized")
  t.equal(cache.length, 4) //++BB
  t.equal(cache.get("a"), undefined)
  t.equal(cache.get("b"), "++BB")
  t.end()
})

test("set returns proper booleans", function(t) {
  var cache = new LRU({
    max: 5,
    length: function (item) { return item.length }
  })

  t.equal(cache.set("a", "A"), true)

  // should return false for max exceeded
  t.equal(cache.set("b", "donuts"), false)

  t.equal(cache.set("b", "B"), true)
  t.equal(cache.set("c", "CCCC"), true)
  t.end()
})

test("drop the old items", function(t) {
  var cache = new LRU({
    max: 5,
    maxAge: 50 / 1000
  })

  cache.set("a", "A")

  setTimeout(function () {
    cache.set("b", "b")
    t.equal(cache.get("a"), "A")
  }, 25)

  setTimeout(function () {
    cache.set("c", "C")
    // timed out
    t.notOk(cache.get("a"))
  }, 60 + 25)

  setTimeout(function () {
    t.notOk(cache.get("b"))
    t.equal(cache.get("c"), "C")
  }, 90)

  setTimeout(function () {
    t.notOk(cache.get("c"))
    t.end()
  }, 155)
})

test("individual item can have its own maxAge", function(t) {
  var cache = new LRU({
    max: 5,
    maxAge: 50 / 1000
  })

  cache.set("a", "A", { maxAge: 20 / 1000 })
  setTimeout(function () {
    t.notOk(cache.get("a"))
    t.end()
  }, 25)
})

test("individual item can have its own maxAge > cache's", function(t) {
  var cache = new LRU({
    max: 5,
    maxAge: 20 / 1000
  })

  cache.set("a", "A", { maxAge: 50 / 1000 })
  setTimeout(function () {
    t.equal(cache.get("a"), "A")
    t.end()
  }, 25)
})

test("individual item can have its own staleWhileRevalidate", function(t) {
  var cache = new LRU({
    max: 5,
    maxAge: 20 / 1000,
    staleWhileRevalidate: 20 / 1000
  })

  cache.set("a", "A", { staleWhileRevalidate: 0 / 1000 }) // expires in 20
  cache.set("b", "B") // expires in 40
  cache.set("c", "C", { staleWhileRevalidate: 40 / 1000 }) // expires in 60
  
  t.equal(cache.get("a"), "A")
  t.equal(cache.get("b"), "B")
  t.equal(cache.get("c"), "C")

  setTimeout(function () {
    t.notOk(cache.get("a"))
    t.equal(cache.get("b"), "B")
    t.equal(cache.get("c"), "C")
  }, 21)

  setTimeout(function () {
    t.notOk(cache.get("a"))
    t.notOk(cache.get("b"))
    t.equal(cache.get("c"), "C")
  }, 41)

  setTimeout(function () {
    t.notOk(cache.get("a"))
    t.notOk(cache.get("b"))
    t.notOk(cache.get("c"))
    t.end()
  }, 61)
})

test("cache forever by default", function(t) {
  var cache = new LRU()

  t.ok(cache.set("a", "A"))
  setTimeout(function () {
    t.equal(cache.get("a"), "A")
    t.end()
  }, 500)
})

test("do not cache maxAge set to 0", function(t) {
  var cache = new LRU({
    maxAge: 0
  })
  t.notOk(cache.set("a", "A"))
  t.notOk(cache.has("a"))
  t.notOk(cache.get("a"))
  t.end()
})

test("do not cache cacheControl set to no-cache", function(t) {
  var cache = new LRU({
    cacheControl: 'no-cache'
  })
  t.notOk(cache.set("a", "A"))
  t.notOk(cache.has("a"))
  t.notOk(cache.get("a"))
  t.end()
})

test("do not cache individual items with cacheControl set to no-cache", function(t) {
  var cache = new LRU()
  t.notOk(cache.set("a", "A", {
    cacheControl: 'no-cache'
  }))
  t.notOk(cache.has("a"))
  t.notOk(cache.get("a"))
  t.end()
})

test("cache cacheContorl set to max-age=1, stale-while-revalidate=1000", function(t) {
  var cache = new LRU({
    cacheControl: 'max-age=1, stale-while-revalidate=1000'
  })

  t.ok(cache.set("a", "A"))
  t.equal(cache.get("a"), "A")
  setTimeout(function () {
    t.ok(cache.isStale("a"))
    t.notOk(cache.isPastStale("a"))
    t.equal(cache.get("a"), "A")
    t.end()
  }, 1100)
})

test("isStale", function(t) {
  var cache = new LRU({
    max: 5,
    maxAge: 30 / 1000,
    staleWhileRevalidate: 1000 / 1000
  })

  cache.set("a", "A", { maxAge: 10 / 1000 }) // stale in 10
  cache.set("b", "B") // stale in 30
  cache.set("c", "C", { maxAge: 50 / 1000 }) // stale in 50
  
  t.notOk(cache.isStale("a"))
  t.notOk(cache.isStale("b"))
  t.notOk(cache.isStale("c"))

  setTimeout(function () {
    t.ok(cache.isStale("a"))
    t.notOk(cache.isStale("b"))
    t.notOk(cache.isStale("c"))
  }, 11)

  setTimeout(function () {
    t.ok(cache.isStale("a"))
    t.ok(cache.isStale("b"))
    t.notOk(cache.isStale("c"))
  }, 31)

  setTimeout(function () {
    t.ok(cache.isStale("a"))
    t.ok(cache.isStale("b"))
    t.ok(cache.isStale("c"))
    t.end()
  }, 51)
})

test("isPastStale", function(t) {
  var cache = new LRU({
    max: 5,
    maxAge: 20 / 1000,
    staleWhileRevalidate: 20 / 1000
  })

  cache.set("a", "A", { staleWhileRevalidate: 0 / 1000 }) // expires in 20
  cache.set("b", "B") // expires in 40
  cache.set("c", "C", { staleWhileRevalidate: 40 / 1000 }) // expires in 60
  
  t.notOk(cache.isPastStale("a"))
  t.notOk(cache.isPastStale("b"))
  t.notOk(cache.isPastStale("c"))

  setTimeout(function () {
    t.ok(cache.isPastStale("a"))
    t.notOk(cache.isPastStale("b"))
    t.notOk(cache.isPastStale("c"))
  }, 21)

  setTimeout(function () {
    t.ok(cache.isPastStale("a"))
    t.ok(cache.isPastStale("b"))
    t.notOk(cache.isPastStale("c"))
  }, 41)

  setTimeout(function () {
    t.ok(cache.isPastStale("a"))
    t.ok(cache.isPastStale("b"))
    t.ok(cache.isPastStale("c"))
    t.end()
  }, 61)
})

test("revalidate", function(t) {
  var count = 0;
  var cache = new LRU({
    maxAge: 10 / 1000,
    staleWhileRevalidate: 1000 / 1000,
    revalidate: function (key, callback) {
      var value = "A"+(++count);
      setTimeout(function () {
        callback(null, value);
      }, 20);
    }
  })

  cache.set("a", "A")

  t.notOk(cache.isStale("a"))
  t.notOk(cache.isPastStale("a"))
  t.equal(cache.get("a"), "A") // cached value is set correctly
  t.equal(count, 0)

  setTimeout(function () {
    t.ok(cache.isStale("a"))
    t.notOk(cache.isPastStale("a"))
    t.equal(cache.get("a"), "A") // has become stale, will kick off revalidation
    t.equal(count, 1)

    setTimeout(function () {
      t.ok(cache.isStale("a"))
      t.notOk(cache.isPastStale("a"))
      t.equal(cache.get("a"), "A") // 1st revalidation is still pending, will not trigger another one
      t.equal(count, 1)
    }, 1)

    setTimeout(function () {
      t.notOk(cache.isStale("a"))
      t.notOk(cache.isPastStale("a"))
      t.equal(cache.get("a"), "A1") // revalidated value is set correctly
      t.equal(count, 1)
      t.end()
    }, 21)
  }, 11)
})

test("revalidate with errors", function(t) {
  var count = 0;
  var cache = new LRU({
    maxAge: 10 / 1000,
    staleWhileRevalidate: 20 / 1000,
    revalidate: function (key, callback) {
      count++;
      callback(new Error("Some error"), "IGNORE");
    }
  })

  cache.set("a", "A")

  t.notOk(cache.isStale("a"))
  t.notOk(cache.isPastStale("a"))
  t.equal(cache.get("a"), "A") // cached value is set correctly
  t.equal(count, 0)

  setTimeout(function () {
    t.ok(cache.isStale("a"))
    t.notOk(cache.isPastStale("a"))
    t.equal(cache.get("a"), "A") // has become stale, will kick off revalidation
    t.equal(count, 1)

    setTimeout(function () {
      t.ok(cache.isStale("a"))
      t.notOk(cache.isPastStale("a"))
      t.equal(cache.get("a"), "A") // revalidation failed, value is unchanged
      t.equal(count, 2)
    }, 5)

    setTimeout(function () {
      t.notOk(cache.isStale("a"))
      t.ok(cache.isPastStale("a"))
      t.notOk(cache.get("a")) // revalidation failed and maxAge has expired, item is deleted, no revalidation is kicked off
      t.equal(count, 2)
      t.end()
    }, 31)
  }, 11)
})

test("revalidate with updated cache-control options", function(t) {
  var cache = new LRU({
    maxAge: 10 / 1000,
    staleWhileRevalidate: 20 / 1000,
    revalidate: function (key, callback) {
      if (key === "b") return callback(null, "B", { maxAge: 1000 / 1000 });
      callback(null, "A");
    }
  })

  cache.set("a", "A")
  cache.set("b", "B")

  t.notOk(cache.isStale("a"))
  t.notOk(cache.isStale("b"))
  t.notOk(cache.isPastStale("a"))
  t.notOk(cache.isPastStale("b"))
  t.equal(cache.get("a"), "A") // cached value is set correctly
  t.equal(cache.get("b"), "B") // cached value is set correctly

  setTimeout(function () {
    t.ok(cache.isStale("a"))
    t.ok(cache.isStale("b"))
    t.notOk(cache.isPastStale("a"))
    t.notOk(cache.isPastStale("b"))
    t.equal(cache.get("a"), "A") // has become stale, will kick off revalidation
    t.equal(cache.get("b"), "B") // has become stale, will kick off revalidation

    setTimeout(function () {
      t.notOk(cache.isStale("a"))
      t.notOk(cache.isStale("b"))
      t.ok(cache.isPastStale("a")) // has expired
      t.notOk(cache.isPastStale("b")) // has not expired due to updated maxAge
      t.notOk(cache.get("a"))
      t.equal(cache.get("b"), "B")
      t.end()
    }, 51)
  }, 11)
})

test("wrap", function(t) {
  var cache = new LRU(100)
  var count = 0;
  function work(callback) {
    count++;
    callback(null, "A", { maxAge: 10 / 1000, staleWhileRevalidate: 20 / 1000 });
  }

  cache.wrap("a", work, function (error, value) {
    t.notOk(cache.isStale("a"))
    t.notOk(cache.isPastStale("a"))
    t.equal(value, "A") // cached value is returned correctly
    t.equal(count, 1)
  });

  setTimeout(function () {
    t.notOk(cache.isStale("a"))
    t.notOk(cache.isPastStale("a"))
    cache.wrap("a", work, function (error, value) {
      t.notOk(cache.isStale("a"))
      t.notOk(cache.isPastStale("a"))
      t.equal(value, "A") // cached value is returned correctly
      t.equal(count, 1) // not stale, has not kicked off revalidation
    });
  }, 1)

  setTimeout(function () {
    t.ok(cache.isStale("a")) // has become stale, wrap will kick off revalidation
    t.notOk(cache.isPastStale("a"))
    cache.wrap("a", work, function (error, value) {
      t.notOk(cache.isStale("a"))
      t.notOk(cache.isPastStale("a"))
      t.equal(value, "A")
      t.equal(count, 2)
    });

    setTimeout(function () {
      t.notOk(cache.isStale("a"))
      t.ok(cache.isPastStale("a")) // has expired, wrap will kick off revalidation
      cache.wrap("a", work, function (error, value) {
        t.notOk(cache.isStale("a"))
        t.notOk(cache.isPastStale("a"))
        t.equal(value, "A")
        t.equal(count, 3)
        t.end()
      });
    }, 51)
  }, 11)
})

test("disposal function", function(t) {
  var disposed = false
  var cache = new LRU({
    max: 1,
    dispose: function (k, n) {
      disposed = n
    }
  })

  cache.set(1, 1)
  cache.set(2, 2)
  t.equal(disposed, 1)
  cache.set(3, 3)
  t.equal(disposed, 2)
  cache.reset()
  t.equal(disposed, 3)
  t.end()
})

test("disposal function on too big of item", function(t) {
  var disposed = false
  var cache = new LRU({
    max: 1,
    length: function (k) {
      return k.length
    },
    dispose: function (k, n) {
      disposed = n
    }
  })
  var obj = [ 1, 2 ]

  t.equal(disposed, false)
  cache.set("obj", obj)
  t.equal(disposed, obj)
  t.end()
})

test("has()", function(t) {
  var cache = new LRU({
    max: 1,
    maxAge: 10 / 1000
  })

  cache.set('foo', 'bar')
  t.equal(cache.has('foo'), true)
  cache.set('blu', 'baz')
  t.equal(cache.has('foo'), false)
  t.equal(cache.has('blu'), true)
  setTimeout(function() {
    t.equal(cache.has('blu'), false)
    t.end()
  }, 15)
})

test("stale", function(t) {
  var cache = new LRU({
    maxAge: 10 / 1000,
    staleWhileRevalidate: 20 / 1000
  })

  cache.set('foo', 'bar')
  t.equal(cache.has('foo'), true)
  t.equal(cache.get('foo'), 'bar')

  setTimeout(function() {
    t.equal(cache.has('foo'), true)
    t.equal(cache.get('foo'), 'bar')
  }, 20)

  setTimeout(function() {
    t.equal(cache.has('foo'), false)
    t.equal(cache.get('foo'), undefined)
    t.end()
  }, 40)
})

test("lru update via set", function(t) {
  var cache = LRU({ max: 2 });

  cache.set('foo', 1);
  cache.set('bar', 2);
  cache.del('bar');
  cache.set('baz', 3);
  cache.set('qux', 4);

  t.equal(cache.get('foo'), undefined)
  t.equal(cache.get('bar'), undefined)
  t.equal(cache.get('baz'), 3)
  t.equal(cache.get('qux'), 4)
  t.end()
})

test("least recently set w/ peek", function (t) {
  var cache = new LRU(2)
  cache.set("a", "A")
  cache.set("b", "B")
  t.equal(cache.peek("a"), "A")
  cache.set("c", "C")
  t.equal(cache.get("c"), "C")
  t.equal(cache.get("b"), "B")
  t.equal(cache.get("a"), undefined)
  t.end()
})

test("pop the least used item", function (t) {
  var cache = new LRU(3)
  , last

  cache.set("a", "A")
  cache.set("b", "B")
  cache.set("c", "C")

  t.equal(cache.length, 3)
  t.equal(cache.max, 3)

  // Ensure we pop a, c, b
  cache.get("b", "B")

  last = cache.pop()
  t.equal(last.key, "a")
  t.equal(last.value, "A")
  t.equal(cache.length, 2)
  t.equal(cache.max, 3)

  last = cache.pop()
  t.equal(last.key, "c")
  t.equal(last.value, "C")
  t.equal(cache.length, 1)
  t.equal(cache.max, 3)

  last = cache.pop()
  t.equal(last.key, "b")
  t.equal(last.value, "B")
  t.equal(cache.length, 0)
  t.equal(cache.max, 3)

  last = cache.pop()
  t.equal(last, null)
  t.equal(cache.length, 0)
  t.equal(cache.max, 3)

  t.end()
})

test("get and set only accepts strings and numbers as keys", function(t) {
  var cache = new LRU()

  cache.set("key", "value")
  cache.set(123, 456)

  t.equal(cache.get("key"), "value")
  t.equal(cache.get(123), 456)

  t.end()
})

test("peek with wierd keys", function(t) {
  var cache = new LRU()

  cache.set("key", "value")
  cache.set(123, 456)

  t.equal(cache.peek("key"), "value")
  t.equal(cache.peek(123), 456)

  t.equal(cache.peek({
    toString: function() { return "key" }
  }), undefined)

  t.end()
})
