var group, test, groupResults, report, fs, fileName, patt;

fs = require('fs');
require(__dirname + '/../sass');
require(__dirname + '/jsu-public');

if (process.argv.length !== 3) {
	console.log('usage: ' + __filename + ' <jsu-test-file>');
	process.exit(1);
}

fileName = process.argv[2];
patt = /^[.]{0,2}\//

// fix for file name input only - without path
if (!patt.test(fileName)) {
	fileName = process.cwd() + '/' + fileName;
}

// if path is starting like './' replace it with CWD
fileName = fileName.replace(/^[.]\//, process.cwd() + '/');

if (!fs.existsSync(fileName)) {
	console.log('File "' + fileName + "\" doesn't exist.");
	process.exit(2);
}

require(fileName);

JSU.run();
report = JSU.getReport();

console.log('\n--------------------------');

for (group in report) {
	console.log(group);
	groupResults = report[group];
	for (test in groupResults) {
		console.log(' - ' + test + ': ' + groupResults[test]);
	}
}

console.log('--------------------------');
console.log('results: ' + JSU.passedCount() + ' / ' + JSU.count());
