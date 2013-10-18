(function(global) {

	// this make sense only for browser
	if (typeof global.JSU === 'object') {
		return;
	}

	function JSUTest(name, group, fce) {
		this.name = name;
		this.group = group;
		this.result = "N/A";
		this.runInternal = fce;
	}

	JSUTest.prototype = {
		run: function() {
			if (typeof this.runInternal === 'object') {
				this.result = this.runInternal.test();
			} else {
				this.result = this.runInternal();
			}
			return this.result;
		},
		tearDown: function() {
			if (typeof this.runInternal === 'object') {
				this.runInternal.tearDown();
			}
		}
	};

	function _getErrorOrigin() {
		var
			lines, i, line,
			origin = '';

		try {
			throw new Error();
		}
		catch(e) {
			// only for Chrome - inspired by
			// https://github.com/eriwen/javascript-stacktrace/blob/master/stacktrace.js#L56
			if (e.hasOwnProperty('arguments') && typeof e.stack === 'string') {
				//console.log(e.stack);
				lines = e.stack.split('\n');
				for (i = 1; i < lines.length; i++) {
					line = lines[i];
					if (!/utils\/jsu\.js|test\/unit\/modules\/UnitTestRunner/.test(line)) {
						origin = line.trim();
						origin = origin.replace(new RegExp('^.*\\((.*)\\).*$'), '$1');
						origin = (origin.substring(0, 3) !== 'at ' ? 'at ' : '') + origin;
						break;
					}
				}
			}
		}

		return origin;
	}
	
	function AssertionError(message) {
		this.message = message;
		this.origin = _getErrorOrigin();
	}
	AssertionError.prototype.toString = function() {
		return 'Assertion failed: ' + this.message + ' ' + this.origin;
	};

	var
		tests, duplNameCheck, results,
		wasLaunched = false;

	function reset() {
		tests = {};
		duplNameCheck = {};
		results = {};
		wasLaunched = false;
	}

	//init
	reset();

	function _arrayToString(array_object) {
		var key, str = "[", first = true;

		for (key in array_object) {
			if (array_object.hasOwnProperty(key)) {
				if (!first) {
					str += ", ";
				}
				first = false;
				if (key !== 'undefined') {
					str += key + ": ";
				}
				if (array_object[key] instanceof Object) {
					str += _arrayToString(array_object[key]);
				} else {
					str += array_object[key];
				}
			}
		}
		return str + "]";
	}

	function _isFailedResult(result) {
		return typeof result === "string" || result instanceof Array || result instanceof Object || result === false;
	}

	function _updateResultStats(group, name, result) {

		if (results[group] === undefined) {
			results[group] = {
				count: 0,
				failed: 0,
				passed: 0,
				error: 0,
				tests: {}
			};
		}
		group = results[group];

		if (group.tests[':' + name]) {
			if (group.tests[':' + name] === true) {
				group.passed--;
			} else if (_isFailedResult(group.tests[':' + name])) {
				group.failed--;
			} else {
				group.error--;
			}
		} else {
			group.count++;
		}
		group.tests[':' + name] = result;

		if (result === true) {
			group.passed++;
		} else if (_isFailedResult(result)) {
			group.failed++;
		} else {
			group.error++;
		}

	}

	function _runTest(jsuTest) {
		var result;

		this._runningTest = jsuTest;
		try {
			result = jsuTest.run();
		} catch (testErr) {
			result = testErr;
			if (!(testErr instanceof AssertionError)) {
				result += ' ' + _getErrorOrigin();
			}
			jsuTest.result = result;
		}
		delete this._runningTest;

		try {
			jsuTest.tearDown();
		} catch (tearDownErr) {
			if (result === true) {
				result = "Error in tearDown " + tearDownErr;
				if (!(tearDownErr instanceof AssertionError)) {
					result += ' ' + _getErrorOrigin();
				}
				jsuTest.result = result;
			}
		}

		_updateResultStats(jsuTest.group, jsuTest.name, result);
	}

	function runGroup(group) {
		var fce;

		for (fce in tests[group]) {
			if (tests[group].hasOwnProperty(fce)) {
				_runTest(tests[group][fce]);
			}
		}
	}

	function run(group) {
		wasLaunched = true;
		results = {}; //clear results - in case of repeated run

		if (group === undefined) {
			var groupIter;
			
			for (groupIter in tests) {
				if (tests.hasOwnProperty(groupIter)) {
					runGroup(groupIter);
				}
			}
		} else {
			runGroup(group);
		}
	}

	function register(group, name, fce) {
		if (tests[group] === undefined) {
			tests[group] = [];
		}
		duplNameCheck[':' + group] = duplNameCheck[':' + group] || {};
		if (duplNameCheck[':' + group][':' + name] !== undefined) {
			throw 'duplicite name of test';
		}
		duplNameCheck[':' + group][':' + name] = true;

		var
			jsuTest, nameIter,
			testObject = name;

		if (typeof testObject === 'string') {
			testObject = {};
			testObject[name] = fce;
		}

		for (nameIter in testObject) {
			if (testObject.hasOwnProperty(nameIter)) {
				fce = testObject[nameIter];
				jsuTest = new JSUTest(nameIter, group, fce);
				tests[group].push(jsuTest);

				if (wasLaunched) {
					_runTest(jsuTest);
				}
			}
		}
	}
	
	/* * * GET RESULTS METHODS * * */

	function toString() {
		return "results: " + _arrayToString(results);
	}

	function getReport() {
		var group,
			unitTest,
			unitFunction,
			report = {},
			reportClass,
			testName,
			testResult;

		for (group in tests) {
			if (tests.hasOwnProperty(group)) {
				reportClass = {};
				report[group] = reportClass;
				unitFunction = tests[group];

				for (unitTest in unitFunction) {
					if (unitFunction.hasOwnProperty(unitTest)) {
						testName = unitFunction[unitTest].name;

						testResult = unitFunction[unitTest].result;
						testResult = (testResult === true ? 'OK'
							: (testResult === false ? 'FAILED' : 'FAILED: ' + testResult)
						);

						reportClass[testName] = testResult;
					}
				}
			}
		}

		return report;
	}

	function passedCount() {
		var group, count = 0;
		for (group in results) {
			if (results.hasOwnProperty(group)) {
				count += results[group].passed;
			}
		}
		return count;
	}

	function failedCount() {
		var group, count = 0;
		for (group in results) {
			if (results.hasOwnProperty(group)) {
				count += results[group].failed;
			}
		}
		return count;
	}

	function errorCount() {
		var group, count = 0;
		for (group in results) {
			if (results.hasOwnProperty(group)) {
				count += results[group].error;
			}
		}
		return count;
	}

	function getCount() {
		var group, count = 0;
		for (group in results) {
			if (results.hasOwnProperty(group)) {
				count += results[group].count;
			}
		}
		return count;
	}

	/* * * ASSERTION METHODS * * */

	function assertEquals(expected, value, __path) {
		var propPath = ((__path !== undefined) ? (', property: ' + __path) : '');
		if (expected instanceof Date && value instanceof Date) {
			if (expected.getTime() !== value.getTime()) {
				throw new AssertionError("different dates: expected: " + expected + ", got: " + value + propPath);
			}
		} else if (expected !== value) {
			throw new AssertionError('expected: ' + expected + ', got: ' + value + propPath);
		}
	}
	
	function assertObjectEquals(expected, value, ignoreExtraProps, path) {
		if (value === undefined) {
			throw new AssertionError("value is undefined");
		}

		var
			propPath, key,
			propExpected, propValue;

		for (key in expected) {
			if (expected.hasOwnProperty(key)) {
				propPath = ((path !== undefined) ? (path + '.') : '') + key;
				if (value[key] === undefined && !value.hasOwnProperty(key)) {
					throw new AssertionError("undefined property: " + propPath);
				} else {
					propExpected = expected[key];
					propValue = value[key];
					if (propExpected instanceof Object) {
						assertObjectEquals(propExpected, propValue, ignoreExtraProps, propPath);
					} else if (propExpected instanceof Array) {
						assertObjectEquals(propExpected, propValue, ignoreExtraProps, propPath);
					} else {
						assertEquals(propExpected, propValue, propPath);
					}
				}
			}
		}
		if (!ignoreExtraProps) {
			for (key in value) {
				if (value.hasOwnProperty(key)) {
					propPath = ((path !== undefined) ? (path + '.') : '') + key;
					if (value.hasOwnProperty(key) && !expected.hasOwnProperty(key)) {
						throw new AssertionError("extra property found: " + propPath);
					}
				}
			}
		}
	}

	function assertNotEquals(expected, value) {
		if (expected instanceof Date && value instanceof Date) {
			if (expected.getTime() === value.getTime()) {
				throw new AssertionError("different dates: expected: " + expected + ", got: " + value);
			}
		} else if (expected === value) {
			throw new AssertionError("not expected: " + expected + ", got: " + value);
		}
	}

	function assertSame(expected, value) {
		if (expected !== value) {
			throw new AssertionError("expected: " + expected + ", got: " + value);
		}
	}

	function assertNotSame(expected, value) {
		if (expected === value) {
			throw new AssertionError("not expected: " + expected + ", got: " + value);
		}
	}

	function assertDefined(value) {
		if (undefined === value) {
			throw new AssertionError("the value is undefined");
		}
	}

	function assertUndefined(value) {
		if (undefined !== value) {
			throw new AssertionError("the value is defined");
		}
	}

	function assertTrue(value) {
		if (true !== value) {
			throw new AssertionError("the value is not true");
		}
	}

	function assertFalse(value) {
		if (false !== value) {
			throw new AssertionError("the value is not false");
		}
	}

	function assertNotNull(value) {
		if (null === value) {
			throw new AssertionError("the value is null");
		}
	}

	function assertNull(value) {
		if (null !== value) {
			throw new AssertionError("the value is NOT null");
		}
	}

	function fail(message) {
		throw new AssertionError("fail called with message: " + message);
	}

	function expectedException(exception, fn, args, scope) {
		var wasError = true;
		try {
			fn.apply(scope || window, args || []);
			wasError = false;
		} catch (err) {
			if (exception !== undefined) {
				if (typeof exception === 'object') {
					assertObjectEquals(exception, err);
				} else {
					assertEquals(exception, err);
				}
			}
		}
		if (!wasError) {
			throw new AssertionError('exception expected: ' + (exception || ''));
		}
	}

	function approxEquals(expected, value, precision) {
		if (precision === undefined) {
			precision = 5;
		}
		if (typeof expected !== 'number' || typeof value !== 'number') {
			throw new AssertionError('number expected');
		}
		var
			expectedCmp = parseFloat(expected.toPrecision(6)),
			valueCmp = parseFloat(value.toPrecision(6));
		if (expectedCmp !== valueCmp) {
			throw new AssertionError("expected: " + expectedCmp + ", got: " + valueCmp + ', precision: ' + precision);
		}
	}

	var JSU = {
		run: run,
		runGroup: runGroup,
		register: register,
		reset: reset,

		//asserts
		assertObjectEquals: assertObjectEquals,
		assertEquals: assertEquals,
		assertNotEquals: assertNotEquals,
		assertSame: assertSame,
		assertNotSame: assertNotSame,
		assertDefined: assertDefined,
		assertUndefined: assertUndefined,
		assertTrue: assertTrue,
		assertFalse: assertFalse,
		assertNotNull: assertNotNull,
		assertNull: assertNull,
		expectedException: expectedException,
		approxEquals: approxEquals,
		fail: fail,

		//result returning methods
		count: getCount,
		passedCount: passedCount,
		failedCount: failedCount,
		errorCount: errorCount,
		getReport: getReport,
		toString: toString
	};

	/*
	 * browser, node.js and AMD support
	 */

	if (typeof define === 'function' && define.amd) {
		define(function() { return JSU; });
	} else {
		// export in browser and in node.js to global
		global.JSU = JSU;
	}

})(typeof window !== 'undefined' ? window : global);
