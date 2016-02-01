var uuid = require('uuid');
var cache = require('../../')();

var startDate = new Date();
var startMemory = process.memoryUsage().heapUsed;
var avg = 0;

console.log('Iters\tAvg\tTotal\tMemory');
for (x = 1; x <= 1000000; ++x) {
    var d = new Date();

    var key = uuid.v4();
    var value = uuid.v4();
    cache.set(key, { key: key, value: value });

    avg += new Date() - d;

    if (x % 10000 === 0) {
        var total = d - startDate;
        var memory = process.memoryUsage().heapUsed - startMemory;
        console.log(x + '\t' + (avg / 10000) + '\t' + total + '\t' + memory);
        avg = 0;
    }
}
