(function(global) {

	// this make sense only for browser
	if (typeof global.SASS === 'object') {
		return;
	}

	// add trim() support if missing
	if (''.trim === undefined) {
		String.prototype.trim = function() {
			return this.replace(/^\s+|\s+$/g, '');
		};
	}

	var SASS = function(loader, logger, config) {

		this.loader = loader;
		this.logger = logger;
		this.vars = {};
		this.mixins = {};
		this.definitions = [];

		// define default loader
		if ((typeof loader === 'undefined') || (loader === null)) {
			this.loader = new SASS.Loader();
		}

		// default logger
		if ((typeof logger === 'undefined') || (logger === null)) {
			this.logger = new SASS.Logger();
		}

		// default config
		this.config = {
			unknownFunctionError: false,
			unknownFunctionWarning: true,
			keepUnknownFunction: true,
			debugSelector: '#debug',
			keepDebugStyle: false,
			debugComments: false
		};

		// apply config
		if (config) {
			var prop, functions;
			for (prop in config) {
				if (config.hasOwnProperty(prop)) {
					this.config[prop] = config[prop];
				}
			}
			if (config.functions) {
				functions = {};
				for (prop in this.functions) {
					if (this.functions.hasOwnProperty(prop)) {
						functions[prop] = this.functions[prop];
					}
				}
				for (prop in config.functions) {
					if (config.functions.hasOwnProperty(prop)) {
						functions[prop] = config.functions[prop];
					}
				}
				this.functions = functions;
			}
		}

		// default variable provided by this js sass builder
		this.vars['is-running-in-js-sass'] = new SASS.Var(true);

	} // SASS()

	// default SASS loader
	SASS.Loader = function() {

		// see http://en.wikipedia.org/wiki/XMLHttpRequest
		function getXhr() {
			var i,
				xhr = null,
				options = [
					function() {
						return new XMLHttpRequest();
					},
					function() {
						return new ActiveXObject('MSXML2.XMLHTTP.3.0');
					},
					function() {
						return new ActiveXObject('MSXML2.XMLHTTP');
					},
					function() {
						return new ActiveXObject('Microsoft.XMLHTTP');
					}
				],
				len = options.length;

			// get xhr object
			for (i = 0; i < len; i++) {
				try {
					xhr = options[i]();
					break;
				} catch(e) {}
			}

			return xhr;
		}

		function request(path) {
			var xhr = getXhr();

			xhr.open('GET', path, false); // sync request
			xhr.setRequestHeader("Content-Type", "text/css;charset=UTF-8")
			xhr.send();

			if (xhr.status !== 200) {
				return null;
			}
			return xhr.responseText;
		};

		return {getContent: function(url) {
			var ext, scss, stub, chunks, name;

			ext = /\.scss$/
			if (!ext.test(url)) {
				url += '.scss';
			}

			scss = request(url);
			if (scss !== null) {
				return scss;
			}

			stub = /^_/
			chunks = url.split('/');

			if (stub.test(url)) {
				return null;
			}

			name = chunks.pop();
			chunks.push('_' + name);
			url = chunks.join('/');

			return request(url);
		}};

	} // SASS.Loader

	SASS.Logger = function() {

		// console.log fallback for Internet Explorer
		if ((console === undefined) || (console.log === undefined)) {
			return {
				errors: [],

				log: function(message) {},
				warning: function(message) {},
				error: function(message) {
					this.errors.push(message);
				}
			};
		}

		return {
			errors: [],

			log: function(message) {
				//console.log(message);
			},
			warning: function(message) {
				console.log('Warning: ' + message);
			},
			error: function(message) {
				this.errors.push(message);
				console.log('Error: ' + message);
			}
		};
	} // SASS.Logger

	SASS.Var = function(value, used) {
		this.value = value;
		this.used = used || 0;
	};

	SASS.bind = function(fn, scope) {
		return function() {
			return fn.apply(scope, arguments || []);
		};
	};

	SASS.Var.clone = function(origVar) {
		// creates the proxied var
		return {get: SASS.bind(origVar.get, origVar)};
	}
	SASS.Var.prototype.get = function() {
		this.used++;
		return this.value;
	};

	SASS.prototype = {
		NAME_REGEX: new RegExp('[a-zA-Z0-9-]', 'gm'),
		VARIABLE_REGEX: new RegExp('\\$([a-zA-Z][a-zA-Z-]*)', 'gm'),
		FUNCTION_START_REGEX: new RegExp('[a-zA-Z-]\\(', 'gm'),
		QUOTED_STRING_REGEX: new RegExp('^([\'"])((?:(?!\\1).)*)\\1$'),
		NOT_DEFAULT_RULE_REGEX: new RegExp('(\\s+!default\\s*)$'),
		// following reg-exp is used for evaluation of an expression in conditions (@if/@else if)
		EXPRESSION_REGEX: new RegExp([
			// QUOTED_STRING_REGEX - contains 3 back-refs
			'(([\'"])((?:(?!\\2).)*)\\2)',
			// BOOLEAN_REGEX - contains 1 back-ref
			'(true|false)',
			// NUMBER_REGEX - contains 1 back-ref
			'(\\d+\\.\\d+|\\d+|\\.\\d+)(?:px)?',
			// UNQUOTED_STRING_REGEX - contains 1 back-ref
			'([a-z0-9_-]+(?:\\s*[a-z0-9_-]+)*)'
		].join('|'), 'gi'),

		extensionTypeMapping: {
			'png': 'png',
			'gif': 'gif',
			'jpg': 'jpeg',
			'jpeg': 'jpeg'
		},

		functions: {
			ceil: function(value) { //FIXME: accepts only px for now
				var units = value.indexOf('px') !== -1 ? 'px' : '';
				value = value.replace(/px/g, '');
				value = Function.prototype.constructor.call(Function.prototype, 'return Math.ceil(' + value + ');')();
				return value + units;
			},

			floor: function(value) {
				var units = value.indexOf('px') !== -1 ? 'px' : '';
				value = value.replace(/px/g, '');
				value = Function.prototype.constructor.call(Function.prototype, 'return Math.floor(' + value + ');')();
				return value + units;
			},

			round: function(value) {
				var units = value.indexOf('px') !== -1 ? 'px' : '';
				value = value.replace(/px/g, '');
				value = Function.prototype.constructor.call(Function.prototype, 'return Math.round(' + value + ');')();
				return value + units;
			},

			lighten: function(color, amount) {
				amount = amount.replace(/%/g, '');
				color = new SASS.Color(color);
				color.add(255 * amount / 100);
				return color.toCss();
			},

			darken: function(color, amount) {
				amount = amount.replace(/%/g, '');
				color = new SASS.Color(color);
				color.add(- 255 * amount / 100);
				return color.toCss();
			},

			hsb: function(hue, saturation, value) {
				return SASS.Color.fromHsb(hue, saturation, value).toCss();
			},

			mix: function(background, over, amount) {

				var alpha = amount.replace(/%/g, '') / 100;
				over = new SASS.Color(over);
				background = new SASS.Color(background);

				background.mix(over.red, over.green, over.blue, alpha);

				return background.toCss();
			},

			mixBlack: function(background, amount) {
				return this.functions.mix(background, '#000000', amount);
			},

			mixWhite: function(background, amount) {
				return this.functions.mix(background, '#FFFFFF', amount);
			},

			ieGradient: function(opacity) {
				return 'progid:DXImageTransform.Microsoft.Alpha(Opacity=' + (opacity * 100)  + ')';
			},
			transparentize: function(color, amount) {
				color = new SASS.Color(color);
				color.setAlpha(color.getAlpha() - amount);
				return color.toRgba();
			}
		},
		stdCssFunctions: {
			url: 1,
			rgb: 1,
			alpha: 1,
			rgba: 1,

			'progid:DXImageTransform.Microsoft.gradient': 1,
			'progid:DXImageTransform.Microsoft.Shadow': 1,
			from: 1,
			to: 1,
			'-webkit-gradient': 1,
			'-webkit-linear-gradient': 1,
			'-moz-linear-gradient': 1,
			'-o-linear-gradient': 1,
			'linear-gradient': 1,
			'color-stop': 1,
			'-ms-linear-gradient': 1,
			'gradient': 1
		},

		log: function(str) {
			this.logger.log(str);
		},

		warning: function(str) {
			if (this.fileName) {
				str = this.fileName + ': ' + str;
			}
			this.logger.warning(str + ', line: ' + this.lineNumber);
		},

		error: function(str) {
			if (this.fileName) {
				str = this.fileName + ': ' + str;
			}
			this.logger.error(str + ', line: ' + this.lineNumber + ', position: ' + this.idx + ', prev: ' + this.str.substring(0, this.idx) + '\nnext: ' + this.str.substring(this.idx));
		},

		assert: function(expression, message) {
			if (expression !== true) {
				 this.error('assertion failed' + (message ? ': ' + message : ''));
			}
		},

		checkChar: function(ch) {
			if (this.ch != ch) {
				this.error(ch + ' is expected');
			}
			this.nextChar();
		},

		isWhitespace: function(ch) {
			return ch == ' ' || ch == '\t' || ch == '\n' || ch == '\x0B' || ch == '\f' || ch == '\r';
		},

		trim2: function(value) {
			while (value.length > 0 && this.isWhitespace(value.charAt(0))) {
				value = value.substring(1);
			}
			return value.trim();
		},

		nextChar: function() {
			this.idx++;
			if (this.str && this.idx < this.str.length) {
				this.ch = this.str.charAt(this.idx);
			} else {
				this.str = this.input.read(100); //buffer size is 100
				if (this.str && this.str.length > 0) {
					this.idx = 0;
					this.ch = this.str.charAt(this.idx);
				} else {
					this.idx = false;
					this.ch = false;
				}
			}
			if (this.ch === '\n') {
				this.lineNumber++;
			}
			return this.ch;
		},

		tasteNext: function() {
			if (this.str) {
				if (this.idx + 1 < this.str.length) {
					return this.str.charAt(this.idx + 1);
				} else {
					this.str += this.input.read(100);
					return (this.idx + 1 < this.str.length) ? this.str.charAt(this.idx + 1) : false;
				}
			} else {
				return false;
			}
		},

		insertString: function(str) {
			if (this.idx === false) {
				//end of file or stream was reached, we need reset the idx and read next char
				this.idx = -1;
				this.str = str;
				this.nextChar();
			} else {
				this.str = this.str.substring(0, this.idx) + str + this.str.substring(this.idx);
			}
		},

		eatWhitespaces: function() {
			var spaceEaten = false;
			while (this.ch && this.isWhitespace(this.ch)) {
				this.nextChar();
				spaceEaten = true;
			}
			return spaceEaten;
		},

		isPartOfName: function(ch, includeColon) {
			this.NAME_REGEX.lastIndex = 0;
			if (includeColon && ch === ':') {
				return true;
			} else {
				return this.NAME_REGEX.test(ch);
			}
		},

		parseName: function(doNotInterpolate, doNotCheckLength) {
			var
				name = '',
				variableName;

			while (true) {
				while (this.isPartOfName(this.ch) || (this.ch === ':' && this.isPartOfName(this.tasteNext()))) {
					name += this.ch;
					this.nextChar();
				 }
				if (!doNotInterpolate && this.ch === '#') {
					//Interpolation
					this.nextChar();
					this.checkChar('{');
					this.checkChar('$');
					variableName = this.parseName(true);
					this.checkChar('}');
					if (this.vars[variableName]) {
						name += this.vars[variableName].get();
					} else {
						this.error('undefined variable: \'$' + variableName + '\'');
					}
				} else {
					break;
				}
			}
			if (name.length === 0 && !doNotCheckLength) {
				this.error('Expecting variable name, character is not part of name: ' + this.ch);
			}
			return name;
		},

		parseValue: function() {
			var
				value = '',
				variableName,
				quote;

			while (this.ch && this.ch !== ';') {
				if (this.ch === '#') {
					this.nextChar();
					if (this.ch === '{') {
						this.nextChar();
						this.checkChar('$');
						variableName = this.parseName(true);
						this.checkChar('}');
						if (this.vars[variableName]) {
							value += this.vars[variableName].get();
						} else {
								this.error('undefined variable: \'$' + variableName + '\'');
						}
					} else {
						value += '#';
					}
				} else if (this.ch === '\'' || this.ch === '"') {
					quote = this.ch;
					value += this.ch;
					this.nextChar();
					while (this.ch && this.ch !== quote) {
						value += this.ch;
						this.nextChar();
					}
					value += this.ch;
					this.checkChar(quote);
				} else {
					if (this.ch === '{') {
						this.error('unexpected character: ' + this.ch);
					} else if (this.ch === '\n') {
						this.error('unexpected character: ' + this.ch);
					}
					value += this.ch;
					this.nextChar();
				}
			}
			return this.trim2(value);
		},

		splitArgs: function(argString) {
			var args = [], i = 0, idx = -1, ch,
				isWhitespace = this.isWhitespace,
				skipWhites = function() {
					while (i < argString.length && isWhitespace(argString.charAt(i))) {
						i++;
					}
				};

			skipWhites();
			while (i < argString.length) {
				if (idx === -1) {
					args.push('');
					idx++;
				}
				ch = argString.charAt(i);
				if (ch === '\'' || ch === '"') {
					i++;
					while (i < argString.length && argString.charAt(i) !== ch) {
						args[idx] += argString.charAt(i);
						i++;
					}
					if (argString.charAt(i) !== ch) {
						this.error('unexpected character: ' + ch);
					}
					i++;
					skipWhites();
					if (i < argString.length && argString.charAt(i) !== ',') {
						this.error('unexpected character: ' + argString.charAt(i));
					}
				} else if (ch === ',') {
					args.push('');
					idx++;
					i++;
				} else {
					args[idx] += argString.charAt(i);
					i++;
				}
			}
			return args;
		},

		applyFunctions: function(value) {
			var
				pos = 0,
				idx,
				fceName,
				deep = 0,
				nestedFunctionCall = false,
				args,
				fceResult,
				callStartPos,
				callEndPos,
				found;

			this.FUNCTION_START_REGEX.lastIndex = 0;
			while ((found = this.FUNCTION_START_REGEX.exec(value)) !== null) {
				idx = found.index;
				pos = idx + 1;
				while (idx >= 0 && /[a-z-]/i.test(value.charAt(idx))) {
					idx--;
				}
				if (idx + 1 === pos) {
					this.error('wrong syntax, failed to parse function name');
				}
				fceName = value.substring(idx + 1, pos);
				callStartPos = idx + 1;
				callEndPos = pos + 1;
				while (callEndPos < value.length && (deep !== 0 || value.charAt(callEndPos) !== ')')) {
					switch (value.charAt(callEndPos)) {
						case '(':
							deep++;
							nestedFunctionCall = true;
							break;
						case ')':
							deep--;
							break;
					}
					callEndPos++;
				}
				if (callEndPos >= value.length || value.charAt(callEndPos) !== ')') {
					this.error('right bracket for function ' + fceName  + ' not found');
				}

				args = value.substring(pos + 1, callEndPos);
				if (nestedFunctionCall) {
					args = this.applyFunctions(args);
				}
				args = this.splitArgs(args);

				//this.log('function found: ' + fceName);
				if (!this.functions[fceName]) {
					if (this.stdCssFunctions[fceName]) {
						found.index += 1; //skip
					} else {
						if (this.config.unknownFunctionError) {
							this.error('unknown function: ' + fceName);
						} else if (this.config.unknownFunctionWarning) {
							this.warning('unknown function: ' + fceName);
						}
						if (this.config.keepUnknownFunction) {
							found.index += 1;
						} else {
							value = value.substring(0, callStartPos) + value.substring(callEndPos + 1);
						}
					}
				} else {
					fceResult = this.functions[fceName].apply(this, args);
					value = value.substring(0, callStartPos) + fceResult + value.substring(callEndPos + 1);
					found.index += fceResult.length;
				}

				pos++;
				this.FUNCTION_START_REGEX.lastIndex = found.index;
			}
			return value;
		},

		applyVariables: function(value) {
			var
				found,
				clcSafe = 0,
				variableValue;

			//replace variables
			this.VARIABLE_REGEX.lastIndex = 0;
			while ((found = this.VARIABLE_REGEX.exec(value)) !== null) {
				variableValue = this.vars[found[1]];
				if (undefined !== variableValue) {
					variableValue = variableValue.get();
					value = value.substring(0, found.index) + variableValue + value.substring(found.index + found[0].length);
				} else {
					value = value.substring(0, found.index) + value.substring(found.index + found[0].length);
					this.error('undefined variable: \'' + found[1] + '\'');
				}
				clcSafe++;
				if (clcSafe > 100) {
					this.error('infinite loop');
				}
				this.VARIABLE_REGEX.lastIndex = 0;
			}
			return value;
		},

		applyToValue: function(value) {
			return this.applyFunctions(this.applyVariables(value));
		},

		applyToValues: function(values) {
			var i;

			for (i = 0; i < values.length; i++) {
				values[i] = this.applyToValue(values[i]);
			}
		},

		parseSelector: function(doNotInterpolate) {
			var
				name = '',
				variableName,
				firstChar = this.ch;

			this.nextChar();

			if (firstChar === '>' && this.isWhitespace(this.ch)) {
				return firstChar;
			}

			if ((firstChar === '&' || firstChar === '+') && this.isPartOfName(this.ch)) {
				firstChar += this.ch;
				this.nextChar();
			}

			while (true) {
				while (this.isPartOfName(this.ch) || (this.ch === ':' && this.isPartOfName(this.tasteNext(), true))) {
					name += this.ch;
					this.nextChar();
					if (name.charAt(name.length - 1) === ':' && this.ch === ':') {
						name += this.ch;
						this.nextChar();
					}
				}
				if (!doNotInterpolate && this.ch === '#') {
					//Interpolation
					this.nextChar();
					this.checkChar('{');
					this.checkChar('$');
					variableName = this.parseName(true);
					this.checkChar('}');
					if (this.vars[variableName]) {
						name += this.vars[variableName].get();
					} else {
						this.error('undefined variable: \'$' + variableName + '\'');
					}
				} else {
					break;
				}
			}
			if (name.length === 0 && !this.isPartOfName(firstChar) && firstChar !== '&' && firstChar !== '+') {
				this.error('Expecting variable name, character is not part of name: ' + this.ch);
			}
			return firstChar + name;
	  },

		parseSelectors: function() {
			var
				name,
				selector = '',
				selectors = [];

			while (this.ch && this.ch !== '{') {
				name = this.parseSelector(false);
				selector += name;
				if (this.isWhitespace(this.ch)) {
					selector += ' ';
				}
				this.eatWhitespaces();
				if (this.ch === ',') {
					selectors.push(selector.trim());
					selector = '';
					this.nextChar();
					this.eatWhitespaces();
				}
			}
			if (selector.length > 0) {
				selectors.push(selector.trim());
			}
			if (selectors.length === 0) {
				this.error('Selector expected');
			}
			return selectors;
		},

		combineSelectors: function(parentSelectors, childSelectors) {
			if (!parentSelectors) {
				return childSelectors
			}

			var
				result = [],
				i,
				j,
				childSelector;

			for (i = 0; i < parentSelectors.length; i++) {
				for (j = 0; j < childSelectors.length; j++) {
					childSelector = childSelectors[j];
					if (childSelector.indexOf('&') !== -1) {
						result.push(childSelector.replace('&', parentSelectors[i]));
						if (result[result.length - 1].indexOf('&') !== -1) {
							this.error('Invalid usage of &');
						}
					} else {
						result.push(parentSelectors[i] + ' ' + childSelector);
					}
				}
			}
			return result;
		},

		selectorsEquals: function(sel1, sel2) {
			if (sel1 === undefined && this.config.debugComments) {
				return false;
			}

			var i;

			if (sel1.length !== sel2.length) {
				 return false;
			}
			for (i = 0; i < sel1.length; i++) {
				if (sel1[i] !== sel2[i]) {
					return false;
				}
			}
			return true;
		},

		parseArgument: function() {
			var
				argument = '',
				deep = 0;

			while (this.ch && ((this.ch !== ')' && this.ch !== ',') || deep > 0)) {
				if (this.ch === '(') {
					deep++;
				} else if (this.ch === ')') {
					deep--;
				}
				argument += this.ch;
				this.nextChar();
			}
			return argument;
		},

		parseArguments: function() {
			var args = [];

			this.checkChar('(');
			this.eatWhitespaces();
			while (this.ch && this.ch !== ')') {
				args.push(this.parseArgument());
				this.eatWhitespaces();
				if (this.ch !== ')') {
					this.checkChar(',');
					this.eatWhitespaces();
				}
			}
			this.checkChar(')');
			this.eatWhitespaces();
			return args;
		},

		includeMixin: function(name, args) {
			if (this.mixins[name]) {
				this.log('include mixin: ' + name);
				var
					mixin = this.mixins[name],
					i;
				mixin.usedCount++;
				if (!mixin.firstUsed) {
					mixin.firstUsed = this.fileName;
				} else if (mixin.firstUsed !== this.fileName && mixin.fileName !== this.fileName) {
					mixin.usedInOneFile = false;
				}

				if (args) {
					this.assert(args.length === mixin.args.length, 'Number of arguments and number of params is not equal, mixin: ' + name);
					for (i = 0; i < mixin.args.length; i++) {
						this.vars[mixin.args[i]] = new SASS.Var(args[i]);
					}
				} else {
					this.assert(undefined !== mixin.args, 'Missing arguments for mixin: ' + name);
				}
				this.insertString(mixin.definition + '}');
				this.idx--;
				this.nextChar();
			} else {
				this.error('can not include undefined mixin: ' + name);
			}
		},

		cloneVariables: function(variables) {
			var
				prop,
				clone = {};

			for (prop in variables) {
				if (variables.hasOwnProperty(prop)) {
					clone[prop] = SASS.Var.clone(variables[prop]);
				}
			}
			return clone;
		},

		parseCondition: function() {
			this.log('parseCondition');

			var
				expression = '',
				expressionResult,
				name,
				definition;

			//xxx
			while (this.ch && this.ch !== '{') {
				expression += this.ch;
				this.nextChar();
			}

			expressionResult = this.evaluateExpression(expression);

			this.eatWhitespaces();
			if (expressionResult) {
				definition = this.readDefinition();
			} else {
				this.readDefinition();
			}

			while (true) {
				this.eatWhitespaces();
				if (this.ch === '@' && this.tasteNext() === 'e') { //@else
					this.nextChar();
					name = this.parseName();
					if (name !== 'else') {
						this.error('Unsupported operation: ' + name);
					}
					this.eatWhitespaces();
					if (this.ch === 'i') { //@else if
						name = this.parseName();
						if (name !== 'if') {
							this.error('Unsupported operation: ' + name);
						}
						if (expressionResult) {
							this.eatWhitespaces();
							//skip expression
							while (this.ch && this.ch !== '{') {
								expression += this.ch;
								this.nextChar();
							}
							this.readDefinition();
						} else {
							definition = this.parseCondition();
							break; //all otner condition were eaten
						}
					} else {
						this.eatWhitespaces();
						if (expressionResult) {
							this.readDefinition();
						} else {
							definition = this.readDefinition();
						}
						break; //this was last condition @else {
					}
				} else { //no other condition
					break;
				}
			}
			if (definition) {
				this.insertString(' ' + definition);
				this.nextChar();
			}

			//this.log('expressionResult: ' + expressionResult);
		},


		evaluateExpression: function(rawExpression) {
			var expression,
					expressionRegex = this.EXPRESSION_REGEX,
					match = null,
					outputExpr = [],
					startIndex = 0,
					endIndex = 0,
					lastIndex = 0,
					betweenMatches = '',
					QUOTE = '"',
					result = false,
					quotedStringMatch,
					numberMatch,
					booleanMatch,
					unquotedMatch;

			expression = this.applyToValue(rawExpression);
			expressionRegex.lastIndex = lastIndex;
			do {
				match = expressionRegex.exec(expression);

				if (match !== null) {
					startIndex = lastIndex;
					lastIndex = expressionRegex.lastIndex;
					endIndex = lastIndex - match[0].length;
					betweenMatches = expression.substring(startIndex, endIndex).trim();
					if (betweenMatches) {
						outputExpr.push(betweenMatches);
					}

					quotedStringMatch = match[1];
					numberMatch = match[4];
					booleanMatch = match[5];
					unquotedMatch = match[6];

					if (quotedStringMatch) {
						// QUOTED_STRING_REGEX passed
						outputExpr.push(quotedStringMatch);
					}
					else if (numberMatch) {
						// NUMBER_REGEX passed
						outputExpr.push(numberMatch);
					}
					else if (booleanMatch) {
						// BOOLEAN_REGEX passed
						outputExpr.push(booleanMatch.toLowerCase());
					}
					else if (unquotedMatch) {
						// UNQUOTED_STRING_REGEX passed
						outputExpr.push(QUOTE);
						outputExpr.push(unquotedMatch);
						outputExpr.push(QUOTE);
					}
				}
			} while(match !== null);

			if (outputExpr.length !== 0) {
				if (lastIndex < expression.length) {
					outputExpr.push(expression.substring(lastIndex));
				}
				expression = outputExpr.join('');
				//this.log('evaluateExpression: ' + expression);
				try {
					eval('result = (' + expression + ')');
				} catch (exception) {
					this.error('Error when evaluation the expression ' + rawExpression + ' (for eval: ' + outputExpr + ')');
				}
			}

			return result;
		},


		parseDefinition: function() {
			//this.log('parseDefinition');
			var
				name,
				deep = 0,
				definitions = [],
				selectors = [undefined],
				currentSelectors,
				parseBracket,
				spaceEaten,
				propertyPrefix,
				value,
				args,
				varScope = [];

			while (this.ch) {
				currentSelectors = undefined;
				propertyPrefix = undefined;
				//this.log('char: ' + this.ch + ", deep: " + deep);
				if (this.ch === '@') {
					this.nextChar();
					name = this.parseName();
					this.eatWhitespaces();
					if (name === 'include') {
						name = this.parseName();
						args = ((this.ch === '(') ? this.parseArguments() : undefined);
						this.checkChar(';');
						deep++;
						varScope.push(this.vars);
						this.vars = this.cloneVariables(this.vars);
						selectors.push(selectors[selectors.length - 1]);

						if (args) {
							this.applyToValues(args);
						}
						if (this.config.debugComments) {
							definitions.push({comment: 'include mixin: ' + name + (args && args.length > 0 ? ' args: ' + args.toString() : '')});
						}
						this.includeMixin(name, args);
					} else if (name === 'if') {
						this.parseCondition();
					} else {
						this.error('Unsupported operation: ' + name);
					}
				} else if (this.ch === '$') {
					this.parseVariableDefinition();
				} else if (this.ch === '}') {
					deep--;
					this.nextChar();
					//this.log('closing');
					this.vars = varScope.pop();
					if (deep < 0) {
						this.error('Unexpected character');
					} else if (deep === 0) {
						//this.log('END parseDefinition');
						return definitions;
					}
					selectors.pop();
				} else {
					name = this.parseSelector();
					//this.log('name: ' + name);
					parseBracket = true;
					spaceEaten = this.eatWhitespaces();
					if (this.ch === ':') {
						this.nextChar();
						this.eatWhitespaces();
						if (this.ch !== '{') {
							if (typeof selectors[deep] === 'string') {
								propertyPrefix = selectors[deep];
								currentSelectors = selectors[deep - 1];
							} else {
								propertyPrefix = '';
								currentSelectors = selectors[deep];
							}
							value = {
								name: propertyPrefix + name,
								value: this.applyToValue(this.parseValue())
							};
							if (definitions.length > 0 && this.selectorsEquals(definitions[definitions.length - 1].selectors, currentSelectors)) {
								definitions[definitions.length - 1].values.push(value);
							} else {
								this.checkSelectors(currentSelectors);
								definitions.push({
										selectors: currentSelectors,
										values: [value]
								});
							}
							//this.log('property value: ' + definitions[definitions.length - 1].values);
							this.checkChar(';');
							parseBracket = false;
						} else {
							propertyPrefix = name + '-';
							//this.log('propertyPrefix: ' + propertyPrefix);
						}
					} else if (this.ch === ',') {
						this.nextChar();
						this.eatWhitespaces();
						currentSelectors = this.parseSelectors();
						currentSelectors.unshift(name);
						this.eatWhitespaces();
					} else if (this.ch !== '{') {
						currentSelectors = this.parseSelectors();
						currentSelectors[0] = name + (spaceEaten ? ' ' : '') + currentSelectors[0];
					} else {
						currentSelectors = [name];
					}
					if (parseBracket) {
						this.checkChar('{');
						deep++;
						varScope.push(this.vars);
						this.vars = this.cloneVariables(this.vars);
						if (propertyPrefix) {
								selectors.push(propertyPrefix);
						} else {
							this.assert(undefined !== currentSelectors, 'code error, variable currentSelectors is not defined');
							selectors.push(this.combineSelectors(selectors[selectors.length - 1], currentSelectors));
						}
						//this.log('was selector ' + currentSelectors);
						//this.nextChar();
					}
				}
				this.eatWhitespaces();
			}
			this.error("End of block is expected");
			return undefined;
		},

		checkSelectors: function(selectors) {
			var cnt, i;//, selectorParts, lastSelector;

			for (i = 0, cnt = selectors.length; i < cnt; i++) {
				/*selectorParts = selectors[i].split(' ');
				lastSelector = selectorParts[selectorParts.length -1];

				if (lastSelector.toLowerCase() !== 'body' &&
					(lastSelector.indexOf('.') === -1 && lastSelector.indexOf('#') === -1 && lastSelector.indexOf(':') === -1)
					|| lastSelector === '*') {*/
				if (selectors[i].indexOf('*') !== -1) {
					this.warning('performance: possibly harmful selector ' + selectors[i]);
				}
			}
		},

		readDefinition: function() {
			var
				 value = '',
				 deep = 0;

			this.checkChar('{');

			while (this.ch && (deep !== 0 || this.ch !== '}')) {
				value += this.ch;
				switch (this.ch) {
					case '{':
						deep++;
						break;
					case '}':
						deep--;
						break;
				}
				this.nextChar();
			}
			this.checkChar('}');
			return value;
		},

		parseVariableName: function() {
				this.checkChar('$');
				return this.parseName();
		},

		parseMixin: function() {
			var
				args = [];

			if (this.ch === '(') {
				this.nextChar();
				this.eatWhitespaces();
				while (this.ch && this.ch !== ')') {
					args.push(this.parseVariableName());
					this.eatWhitespaces();
					if (this.ch !== ')') {
						 this.checkChar(',');
						 this.eatWhitespaces();
					}
				}
				this.checkChar(')');
				this.eatWhitespaces();
			}
			return {
				args: args,
				definition: this.readDefinition(),
				usedCount: 0,
				usedInOneFile: true,
				fileName: this.fileName
			}
		},

		parseVariableDefinition: function() {
			var notDefaultRuleRegex = this.NOT_DEFAULT_RULE_REGEX,
				name = this.parseVariableName(),
				value,
				isDefault = true;

			this.checkChar(':');
			value = this.applyToValue(this.parseValue());

			// !default rule recognition
			if (notDefaultRuleRegex.test(value)) {
				if (this.vars[name] === undefined) {
					value = value.replace(notDefaultRuleRegex, '');
				}
				else {
					// the original value of the variable will be preserved
					isDefault = false;
				}
			}

			if (isDefault) {
				// quotes/apostrophes are removed from start/end of value
				// -- for correct behavior when inserting variables into
				//    another strings by usage of #{$variable}
				value = value.replace(this.QUOTED_STRING_REGEX, '$2');

				this.vars[name] = new SASS.Var(value);
			}
			this.checkChar(';');
		},

		parseImport: function() {
			var
				fileName = this.parseValue();

			this.assert(fileName.length > 0, 'Empty import param')
			if (fileName.charAt(0) === '\'' || fileName.charAt(0) === '"') {
				this.assert(fileName.length > 1, 'Empty import param');
				this.assert(fileName[fileName.length - 1] === fileName.charAt(0), 'Empty import param');
				fileName = fileName.substring(1, fileName.length - 1);
			}
			this.assert(fileName.length > 0, 'Empty import param');
			this.checkChar(';');

			if (this.config.debugComments) {
				this.definitions.push({comment: 'import: ' + fileName});
			}

			this.log("import: " + fileName);
			this.insertString(' ' + this.loader.getContent(fileName));
		},

		processStream: function() {
			var name;

			this.nextChar();
			this.eatWhitespaces();
			while (this.ch) {
				switch (this.ch) {
					case '$' : { //variable definition
						this.parseVariableDefinition();
						break;
					}
					case '@' : { //mixin
						this.nextChar();
						name = this.parseName();
						if (name === 'mixin') {
							this.eatWhitespaces();
							name = this.parseName();
							this.eatWhitespaces();
							if (this.mixins[name]) {
								this.warning('Duplicate mixin definition: ' + name);
							}
							this.mixins[name] = this.parseMixin();
							this.log('mixin: ' + name);
						} else if (name === 'import') {
							this.eatWhitespaces();
							this.parseImport();
						} else if (name === 'if') {
							this.eatWhitespaces();
							this.parseCondition();
						} else {
							this.error('Unknown command: ' + name);
						}
						break;
					}
					default: {
						this.definitions = this.definitions.concat(this.parseDefinition())
						/*var def = this.parseDefinition();
						for (var key in def) {
							this.log('definition: ' + def[key].selectors + ' {' + def[key].values + '}');
						}*/
					}
				}
				this.eatWhitespaces();
			}
		},

		process: function(stream, fileName) {
			this.lineNumber = 0;
			this.str = undefined;
			this.fileName = fileName;

			if (typeof stream === 'string') {
				this.input = new SASS.CommentFilterStream(new SASS.InputStringStream(stream));
			} else {
				this.input = stream;
			}

			if (fileName && this.config.debugComments) {
				this.definitions.push({comment: 'source: ' + fileName});
			}
			this.processStream();
		},

		load: function(fileName) {
			var input = this.loader.getStream(fileName);
			this.process(input, fileName);
			input.close();
		},

		filterDebugSelectors: function(selectors) {
			var
				selector,
				i,
				idx,
				nextCharRegex = new RegExp('[\\s\\.#]', 'gm');

			for (i = 0; i < selectors.length; i++) {
				selector = selectors[i];
				nextCharRegex.lastIndex = 0;
				if ((idx = selector.indexOf(this.config.debugSelector)) !== -1 && (idx + this.config.debugSelector.length === selector.length || (nextCharRegex.test(selector.charAt(idx + this.config.debugSelector.length))))) {
					if (this.config.keepDebugStyle) {
						selector = selector.replace(new RegExp(this.config.debugSelector, 'gm'), '').trim();
						if (selector.length === 0) {
							selectors.splice(i, i + 1);
							i--;
						} else {
							selectors[i] = selector;
						}
					} else {
						selectors.splice(i, i + 1);
						i--;
					}
				}
			}
			return selectors;
		},

		toCss: function() {
			var
				i,
				j,
				str = '',
				def,
				selectors;

			for (i = 0; i < this.definitions.length; i++) {
				def = this.definitions[i];
				if (def.comment) {
					if (this.config.debugComments) {
						str += '/* ' + def.comment + ' */\n';
					}
				} else {
					selectors = this.filterDebugSelectors(def.selectors);
					if (selectors.length > 0) {
						for (j = 0; j < selectors.length; j++) {
								if (j > 0) {
									 str += ',\n';
								}
								str += selectors[j];
						}
						str += ' {\n';
						for (j = 0; j < def.values.length; j++) {
								str += '\t' + def.values[j].name + ': ' + def.values[j].value + ';\n';
						}
						str += '}\n';
					}
				}
			}
			this.definitions = [];
			return str;
		},

		postBuildChecks: function() {
			var prop;

			//check mixin usage
			for (prop in this.mixins) {
				if (this.mixins[prop].usedCount < 2 && (this.mixins[prop].usedCount === 0 || this.mixins[prop].firstUsed !== this.mixins[prop].fileName)) {
					this.logger.warning('Usage count of mixin: ' + prop + ' is only: ' + this.mixins[prop].usedCount);
				} else if (this.mixins[prop].usedInOneFile === true && this.mixins[prop].args.length === 0 && this.mixins[prop].firstUsed !== this.mixins[prop].fileName) {
					this.logger.warning('Mixin: ' + prop + ' is used only in one file: ' + this.mixins[prop].firstUsed + '  ' + this.mixins[prop].fileName);
				}
			}
			for (prop in this.vars) {
				if (this.vars[prop].used === 0) {
					this.logger.warning('Unused variable: ' + prop);
				}
			}
		}
	};

	SASS.Color = function(value, green, blue, alpha) {
		if (value >= 0 && green >= 0 && blue >= 0) {
			this.red = value;
			this.green = green;
			this.blue = blue;
			this.alpha = alpha || 1.0;
		} else if (value && value.length > 0) {
			value = SASS.Color.NameToColor[value] || value;
			if (value.charAt(0) === '#') {
				if (value.length === 4) {
					this.red = parseInt(value.substring(1, 2), 16) * 16;
					this.green = parseInt(value.substring(2, 3), 16) * 16;
					this.blue = parseInt(value.substring(3, 4), 16) * 16;
				} else if (value.length === 7) {
					this.red = parseInt(value.substring(1, 3), 16);
					this.green = parseInt(value.substring(3, 5), 16);
					this.blue = parseInt(value.substring(5, 7), 16);
				} else {
					throw 'invalid color value: ' + value;
				}
			} else {
				throw 'invalid color value: ' + value;
			}
		} else {
			throw 'invalid call, at least one param expected';
		}
	};

	SASS.Color.fromHsb = function(hue, saturation, value) {
		var i, f, p, q, t, red, green, blue;

		saturation = saturation / 100;
		value = value / 100;

		i = Math.floor(hue / 60) % 6;
		f = (hue / 60) - i;
		p = value * (1 - saturation);
		q = value * (1 - (f * saturation));
		t = value * (1 - ((1 - f) * saturation));

		switch(i) {
			case 0:
				red = value;
				green = t;
				blue = p;
				break;
			case 1:
				red = q;
				green = value;
				blue = p;
				break;
			case 2:
				red = p;
				green = value;
				blue = t;
				break;
			case 3:
				red = p;
				green = q;
				blue = value;
				break;
			case 4:
				red = t;
				green = p;
				blue = value;
				break;
			case 5:
				red = value;
				green = p;
				blue = q;
				break;
			default:
				// nothing here
		}

		return new SASS.Color(red * 255, green * 255, blue * 255);
	}

	SASS.Color.prototype = {

		mix: function(Ro, Go, Bo, Ao) {

			if (Ro !== undefined && Go !== undefined && Bo  !== undefined) {
				Ao = Ao || 1;
				AoC = 1 - Ao;

				this.red = Math.round(AoC * this.red + Ro * Ao);
				this.green = Math.round(AoC * this.green + Go * Ao);
				this.blue = Math.round(AoC * this.blue  + Bo * Ao);

			} else {
				throw 'invalid params';
			}
			this.fixValues();
		},
		mult: function(value, green, blue) {
			if (value && green && blue) {
				this.red *= value;
				this.green *= green;
				this.blue *= blue;
			} else if (value) {
				this.red *= value;
				this.green *= value;
				this.blue *= value;
			} else {
				throw 'invalid params';
			}
			this.fixValues();
		},
		add: function(value, green, blue) {
			if (value && green && blue) {
				this.red += value;
				this.green += green;
				this.blue += blue;
			} else if (value) {
				this.red += value;
				this.green += value;
				this.blue += value;
			} else {
				throw 'invalid params';
			}
			this.fixValues();
		},
		fixValues: function() {
			this.red = (this.red > 255) ? 255 : this.red;
			this.green = (this.green > 255) ? 255 : this.green;
			this.blue = (this.blue > 255) ? 255 : this.blue;

			this.red = (this.red < 0) ? 0 : this.red;
			this.green = (this.green < 0) ? 0 : this.green;
			this.blue = (this.blue < 0) ? 0 : this.blue;
		},
		toCss: function() {
			var value = '#' + (this.red < 16 ? '0' : '') + Math.round(this.red).toString(16)
				+ (this.green < 16 ? '0' : '') + Math.round(this.green).toString(16)
				+ (this.blue < 16 ? '0' : '') + Math.round(this.blue).toString(16);
			return SASS.Color.ColorToName[value] || value;
		},
		setAlpha: function(alpha) {
			this.alpha = alpha;
		},
		getAlpha: function() {
			return this.alpha || 1;
		},
		toRgba: function() {
			var value = 'rgba(' + Math.round(this.red) + ',' + Math.round(this.green) + ',' + Math.round(this.blue) + ',' + (Math.round(this.alpha * 100) / 100) + ')';
			return value;
		}
	};

	SASS.Color.NameToColor = {
		AliceBlue: '#F0F8FF',
		AntiqueWhite: '#FAEBD7',
		Aqua: '#00FFFF',
		Aquamarine: '#7FFFD4',
		Azure: '#F0FFFF',
		Beige: '#F5F5DC',
		Bisque: '#FFE4C4',
		Black: '#000000',
		BlanchedAlmond: '#FFEBCD',
		Blue: '#0000FF',
		BlueViolet: '#8A2BE2',
		Brown: '#A52A2A',
		BurlyWood: '#DEB887',
		CadetBlue: '#5F9EA0',
		Chartreuse: '#7FFF00',
		Chocolate: '#D2691E',
		Coral: '#FF7F50',
		CornflowerBlue: '#6495ED',
		Cornsilk: '#FFF8DC',
		Crimson: '#DC143C',
		Cyan: '#00FFFF',
		DarkBlue: '#00008B',
		DarkCyan: '#008B8B',
		DarkGoldenRod: '#B8860B',
		DarkGray: '#A9A9A9',
		DarkGrey: '#A9A9A9',
		DarkGreen: '#006400',
		DarkKhaki: '#BDB76B',
		DarkMagenta: '#8B008B',
		DarkOliveGreen: '#556B2F',
		Darkorange: '#FF8C00',
		DarkOrchid: '#9932CC',
		DarkRed: '#8B0000',
		DarkSalmon: '#E9967A',
		DarkSeaGreen: '#8FBC8F',
		DarkSlateBlue: '#483D8B',
		DarkSlateGray: '#2F4F4F',
		DarkSlateGrey: '#2F4F4F',
		DarkTurquoise: '#00CED1',
		DarkViolet: '#9400D3',
		DeepPink: '#FF1493',
		DeepSkyBlue: '#00BFFF',
		DimGray: '#696969',
		DimGrey: '#696969',
		DodgerBlue: '#1E90FF',
		FireBrick: '#B22222',
		FloralWhite: '#FFFAF0',
		ForestGreen: '#228B22',
		Fuchsia: '#FF00FF',
		Gainsboro: '#DCDCDC',
		GhostWhite: '#F8F8FF',
		Gold: '#FFD700',
		GoldenRod: '#DAA520',
		Gray: '#808080',
		Grey: '#808080',
		Green: '#008000',
		GreenYellow: '#ADFF2F',
		HoneyDew: '#F0FFF0',
		HotPink: '#FF69B4',
		IndianRed : '#CD5C5C',
		Indigo : '#4B0082',
		Ivory: '#FFFFF0',
		Khaki: '#F0E68C',
		Lavender: '#E6E6FA',
		LavenderBlush: '#FFF0F5',
		LawnGreen: '#7CFC00',
		LemonChiffon: '#FFFACD',
		LightBlue: '#ADD8E6',
		LightCoral: '#F08080',
		LightCyan: '#E0FFFF',
		LightGoldenRodYellow: '#FAFAD2',
		LightGray: '#D3D3D3',
		LightGrey: '#D3D3D3',
		LightGreen: '#90EE90',
		LightPink: '#FFB6C1',
		LightSalmon: '#FFA07A',
		LightSeaGreen: '#20B2AA',
		LightSkyBlue: '#87CEFA',
		LightSlateGray: '#778899',
		LightSlateGrey: '#778899',
		LightSteelBlue: '#B0C4DE',
		LightYellow: '#FFFFE0',
		Lime: '#00FF00',
		LimeGreen: '#32CD32',
		Linen: '#FAF0E6',
		Magenta: '#FF00FF',
		Maroon: '#800000',
		MediumAquaMarine: '#66CDAA',
		MediumBlue: '#0000CD',
		MediumOrchid: '#BA55D3',
		MediumPurple: '#9370D8',
		MediumSeaGreen: '#3CB371',
		MediumSlateBlue: '#7B68EE',
		MediumSpringGreen: '#00FA9A',
		MediumTurquoise: '#48D1CC',
		MediumVioletRed: '#C71585',
		MidnightBlue: '#191970',
		MintCream: '#F5FFFA',
		MistyRose: '#FFE4E1',
		Moccasin: '#FFE4B5',
		NavajoWhite: '#FFDEAD',
		Navy: '#000080',
		OldLace: '#FDF5E6',
		Olive: '#808000',
		OliveDrab: '#6B8E23',
		Orange: '#FFA500',
		OrangeRed: '#FF4500',
		Orchid: '#DA70D6',
		PaleGoldenRod: '#EEE8AA',
		PaleGreen: '#98FB98',
		PaleTurquoise: '#AFEEEE',
		PaleVioletRed: '#D87093',
		PapayaWhip: '#FFEFD5',
		PeachPuff: '#FFDAB9',
		Peru: '#CD853F',
		Pink: '#FFC0CB',
		Plum: '#DDA0DD',
		PowderBlue: '#B0E0E6',
		Purple: '#800080',
		Red: '#FF0000',
		RosyBrown: '#BC8F8F',
		RoyalBlue: '#4169E1',
		SaddleBrown: '#8B4513',
		Salmon: '#FA8072',
		SandyBrown: '#F4A460',
		SeaGreen: '#2E8B57',
		SeaShell: '#FFF5EE',
		Sienna: '#A0522D',
		Silver: '#C0C0C0',
		SkyBlue: '#87CEEB',
		SlateBlue: '#6A5ACD',
		SlateGray: '#708090',
		SlateGrey: '#708090',
		Snow: '#FFFAFA',
		SpringGreen: '#00FF7F',
		SteelBlue: '#4682B4',
		Tan: '#D2B48C',
		Teal: '#008080',
		Thistle: '#D8BFD8',
		Tomato: '#FF6347',
		Turquoise: '#40E0D0',
		Violet: '#EE82EE',
		Wheat: '#F5DEB3',
		White: '#FFFFFF',
		WhiteSmoke: '#F5F5F5',
		Yellow: '#FFFF00',
		YellowGreen: '#9ACD32'
	};
	SASS.Color.ColorToName = {};

	SASS.Color.colorsToLower = function() {
		var
			prop,
			lower = {};

		for (prop in SASS.Color.NameToColor) {
			if (SASS.Color.NameToColor.hasOwnProperty(prop)) {
				lower[prop.toLowerCase()] = SASS.Color.NameToColor[prop];
				SASS.Color.ColorToName[SASS.Color.NameToColor[prop]] = prop;
			}
		}
		for (prop in lower) {
			SASS.Color.NameToColor[prop] = lower[prop];
		}
	};
	SASS.Color.colorsToLower();

	SASS.CommentFilterStream = function(stream) {
		this.stream = stream;
		this.idx = -1;
		this.str = undefined;
		this.inString = false;
		this.escapedChar = false;
	};

	SASS.CommentFilterStream.prototype = {

		nextChar: function() {
			this.idx++;
			if (this.str && this.idx < this.str.length) {
				this.ch = this.str.charAt(this.idx);
			} else {
				this.str = this.stream.read(100); //buffer size is 100
				if (this.str && this.str.length > 0) {
					this.idx = 0;
					this.ch = this.str.charAt(this.idx);
				} else {
					this.idx = false;
					this.ch = false;
				}
			}
			return this.ch;
		},

		read: function(size) {
			var value = '';

			if (undefined === this.str) {
				this.nextChar();
			}
			while (this.ch && value.length < size) {
				if (this.inString) {
					if (this.ch === '\\') {
						this.escapedChar = true;
					} else if (this.escapedChar) {
						this.escapedChar = false;
					} else if (this.inString === this.ch) {
						this.inString = false;
					}
				} else if (this.ch === '\'' || this.ch === '"') {
					this.inString = this.ch;
				} else if (this.ch === '/') {
					 this.nextChar();
					 if (this.ch === '/') {
							while (this.ch && this.ch !== '\n') {
								 this.nextChar();
							}
							this.nextChar();
							continue;
					 } else if (this.ch === '*') {
							this.nextChar();
							do {
								 while (this.ch && this.ch !== '*') {
										this.nextChar();
								 }
								 this.nextChar();
							} while (this.ch && this.ch !== '/');
							this.nextChar();
							continue;
					 } else {
							value += '/';
					 }
				}

				value += this.ch;
				this.nextChar();
			}
			return value;
		},

		close: function() {
			this.stream.close();
			this.str = false;
		}
	};

	SASS.InputStringStream = function(text) {
		this.pos = 0;
		this.text = text;
		this.canRead = this.text !== undefined && this.text.length > 0;
	};

	SASS.InputStringStream.fromFile = function(fileName) {
		var text = '';
		var srcStream = new Stream(fileName, "r");
		while (srcStream.canRead) {
			text += srcStream.readLine();
			text += "\n";
		}
		srcStream.close();

		return new InputStringStream(text);
	}

	SASS.InputStringStream.prototype = {
		readLine: function() {
			var nextEndOfLine = this.text.indexOf('\n', this.pos);
			if (nextEndOfLine === -1 && this.pos < this.text.length) {
				nextEndOfLine = this.text.length;
			}
			if (nextEndOfLine !== -1) {
				var startPos = this.pos;
				this.pos = nextEndOfLine + 1;
				if (nextEndOfLine + 1 >= this.text.length) {
					this.canRead = false;
				}
				return this.text.substring(startPos, nextEndOfLine);
			} else {
				this.canRead = false;
				return '';
			}
		},
		read: function(size) {
			if (this.pos < this.text.length) {
				var value;
				if (this.pos + size < this.text.length) {
					value = this.text.substring(this.pos, this.pos + size);
					this.pos += size;
				} else {
					value = this.text.substring(this.pos, this.text.length);
					this.pos = this.text.length;
					this.canRead = false;
				}
				return value;
			} else {
				this.canRead = false;
				return '';
			}
		},
		close: function() {}
	};

	/*
	 * browser, node.js and AMD support
	 *
	 * see https://github.com/chjj/marked/blob/master/lib/marked.js#L1155
	 * and https://github.com/remy/eventsource-h5d/blob/master/public/EventSource.js#L171
	 */

	if (typeof define === 'function' && define.amd) {
		define(function() { return SASS; });
	} else {
		// export in browser and in node.js to global
		global.SASS = SASS;
	}

})(typeof window !== 'undefined' ? window : global);
