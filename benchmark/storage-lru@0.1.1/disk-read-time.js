var time = process.hrtime;
var uuid = require('uuid');
var async = require('async');
var LocalStorage = require('node-localstorage').LocalStorage;
var StorageLRU = require('storage-lru').StorageLRU;
var localStorage = new LocalStorage('./');
var cache = new StorageLRU(localStorage);

for (var i = 0; i < 1000; i++) {
    var wait = true;
    cache.setItem(i, { key: i, value: uuid.v4() }, { json: true, cacheControl: 'max-age=999999' }, function (error) { wait = false; });
    while (wait) {}
}

console.log('%s	%s	%s', 'Iterations', 'Average (ms)', 'Total (ms)');
var start, prev; start = prev = time();
for (var i = 1; i <= 1e6; i++) {

    var wait = true;
    cache.getItem(i % 1000, { json: true }, function (error, value) { wait = false; });
    while (wait) {}

    if (i % 1e4 === 0) {
        console.log('%d	%d	%d', i, ms(time(prev)) / 1e4, ms(time(start)));
        prev = time();
    }
}

localStorage._deleteLocation();

function ms(tuple) {
    return tuple[0] * 1e3 + tuple[1] / 1e6;
}
