var time = process.hrtime;
var uuid = require('uuid');
var async = require('async');
var localStorage = require('localstorage-memory');
var StorageLRU = require('storage-lru').StorageLRU;
var asyncify = require('storage-lru').asyncify;
var cache = new StorageLRU(asyncify(localStorage));

console.log('%s	%s	%s	%s', 'Iterations', 'Average (ms)', 'Total (ms)', 'Memory Usage (bytes)');
var start, prev; start = prev = time();
var memory = process.memoryUsage().heapUsed;
for (var i = 1; i <= 1e6; i++) {

    var wait = true;
    cache.setItem(i, { key: i, value: uuid.v4() }, { json: true, cacheControl: 'max-age=999999' }, function (error) { wait = false; });
    while (wait) {}
    if (i > 1e5) {
        wait = true
        cache.removeItem(i % 1e5, function (error) { wait = false; });
        while (wait) {}
    }

    if (i % 1e4 === 0) {
        console.log('%d	%d	%d	%d', i, ms(time(prev)) / 1e4, ms(time(start)), process.memoryUsage().heapUsed - memory);
        prev = time();
    }
}

function ms(tuple) {
    return tuple[0] * 1e3 + tuple[1] / 1e6;
}
