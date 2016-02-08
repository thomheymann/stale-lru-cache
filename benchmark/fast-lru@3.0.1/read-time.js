var time = process.hrtime;
var uuid = require('uuid');
var cache = require('fast-lru')({});

for (var i = 0; i < 1000; i++) {
    cache.set(i, { key: i, value: uuid.v4() });
}

console.log('%s	%s	%s', 'Iterations', 'Average (ms)', 'Total (ms)');
var start, prev; start = prev = time();
for (var i = 1; i <= 1e6; i++) {

    var value = cache.get(i % 1000);

    if (i % 1e4 === 0) {
        console.log('%d	%d	%d', i, ms(time(prev)) / 1e4, ms(time(start)));
        prev = time();
    }
}

function ms(tuple) {
    return tuple[0] * 1e3 + tuple[1] / 1e6;
}
