(function(global) {

	var createLogger = function() {
		return {
			errors: [],

			log: function(message) {
				//JSU.log(message);
			},
			warning: function(message) {
				JSU.warn(message);
			},
			error: function(message) {
				this.errors.push(message);
				JSU.error(message);
			}
		};
	}

	var scssToDefinitions = function(text) {
		var jsuLogger = createLogger();
		var sass = new SASS(null, jsuLogger);

		if (text instanceof Array) {
			text = text.join('');
		}

		sass.process(text);
		JSU.assertEquals(0, jsuLogger.errors.length);

		return sass.definitions;
	}

	JSU.register('scss', 'variables', function() {

		JSU.assertObjectEquals([{
			selectors: [
				".content-navigation"
			],
			values: [{
				name: "border-color",
				value: "#3bbfce"
			}, {
				name: "color",
				value: "#24a8b7"
			}]
		}, {
			selectors: [
				".border"
			],
			values: [{
				name: "padding",
				value: "8px"
			}, {
				name: "margin",
				value: "8px"
			}, {
				name: "border-color",
				value: "#3bbfce"
			}]
		}], scssToDefinitions([
			'$blue: #3bbfce;',
			'$margin: 16px;',

			'.content-navigation {',
			'  border-color: $blue;',
			'  color:',
			'    darken($blue, 9%);',
			'}',

			'.border {',
			'  padding: ceil($margin / 2);',
			'  margin: ceil($margin / 2);',
			'  border-color: $blue;',
			'}'
		]));

		return true;
	});

	JSU.register('scss', 'nesting', function() {

		JSU.assertObjectEquals([{
			selectors: [
				"table.hl"
			],
			values: [{
				name: "margin",
				value: "2em 0"
			}]
		}, {
			selectors: [
				"table.hl td.ln"
			],
			values: [{
				name: "text-align",
				value: "right"
			}]
		}, {
			selectors: [
				"li"
			],
			values: [{
				name: "font-family",
				value: "serif"
			}, {
				name: "font-weight",
				value: "bold"
			}, {
				name: "font-size",
				value: "1.2em"
			}]
		}], scssToDefinitions([
			'table.hl {',
			'  margin: 2em 0;',
			'  td.ln {',
			'    text-align: right;',
			'  }',
			'}',

			'li {',
			'  font: {',
			'    family: serif;',
			'    weight: bold;',
			'    size: 1.2em;',
			'  }',
			'}'
		]));

		return true;
	});

	JSU.register('scss', 'mixins', function() {

		JSU.assertObjectEquals([{
			selectors: [
				"#data"
			],
			values: [{
				name: "float",
				value: "left"
			}, {
				name: "margin-left",
				value: "10px"
			}]
		}, {
			selectors: [
				"#data th"
			],
			values: [{
				name: "text-align",
				value: "center"
			}, {
				name: "font-weight",
				value: "bold"
			}]
		}, {
			selectors: [
				"#data td",
				"#data th"
			],
			values: [{
				name: "padding",
				value: "2px"
			}]
		}], scssToDefinitions([
			'@mixin table-base {',
			'  th {',
			'    text-align: center;',
			'    font-weight: bold;',
			'  }',
			'  td, th {padding: 2px;}',
			'}',

			'@mixin left($dist) {',
			'  float: left;',
			'  margin-left: $dist;',
			'}',

			'#data {',
			'  @include left(10px);',
			'  @include table-base;',
			'}'
		]));

		return true;
	});

	JSU.register('scss', 'if-variable-with-pixels', function() {

		JSU.assertObjectEquals([{
			selectors: [
				".selector"
			],
			values: [{
				name: "margin",
				value: "8px"
			}, {
				name: "padding",
				value: "10px"
			}]
		}], scssToDefinitions([
			'$margin: 8px;',
			'.selector {',
			'  @if $margin {',
			'    margin: $margin;',
			'  }',
			'  padding: 10px;',
			'}'
		]));

		JSU.assertObjectEquals([{
			selectors: [
				".selector"
			],
			values: [{
				name: "padding",
				value: "10px"
			}]
		}], scssToDefinitions([
			'$margin: false;',
			'$padding: 10px;',
			'.selector {',
			'  @if $margin {',
			'    margin: $margin;',
			'  }',
			'  @else if $padding {',
			'    padding: $padding;',
			'  }',
			'  @else {',
			'    left: 10px;',
			'  }',
			'}'
		]));

		JSU.assertObjectEquals([{
			selectors: [
				".selector"
			],
			values: [{
				name: "left",
				value: "10px"
			}]
		}], scssToDefinitions([
			'$margin: false;',
			'$padding: false;',
			'.selector {',
			'  @if $margin {',
			'    margin: $margin;',
			'  }',
			'  @else if $padding {',
			'    padding: $padding;',
			'  }',
			'  @else {',
			'    left: 10px;',
			'  }',
			'}'
		]));

		JSU.assertObjectEquals([{
			selectors: [
				'.black'
			],
			values: [{
				name: 'color',
				value: 'black'
			}]
		}, {
			selectors: [
				'.white'
			],
			values: [{
				name: 'color',
				value: 'white'
			}]
		}], scssToDefinitions([
			'@mixin color($color) {',
			'  $def: white !default;',
			'  @if $color {',
			'    $def: $color;',
			'  }',
			'  color: $def;',
			'}',
			'.black {',
			'  @include color(black);',
			'}',
			'.white {',
			'  @include color(false);',
			'}'
		]));

		return true;
	});

	JSU.register('scss', 'selectors-with-plus', function() {
		JSU.assertObjectEquals([{
			selectors: [
				'h1 + h2'
			],
			values: [{
				name: 'color',
				value: 'red'
			}]
		}], scssToDefinitions([
			'h1 + h2{',
			'  color: red;',
			'}'
		]));

		return true;
	});

	JSU.register('scss', 'ceil', function() {

		JSU.assertObjectEquals([{
			selectors: [
				".border"
			],
			values: [{
				name: "padding",
				value: "8px"
			}, {
				name: "margin",
				value: "8px"
			}]
		}], scssToDefinitions([
			'$margin: 16px;',
			'.border {',
			'  padding: ceil($margin / 2);',
			'  margin: ceil($margin / 2);',
			'}'
		]));

		return true;
	});

	JSU.register('scss', 'math-expected-wrong', function() {

		JSU.assertObjectEquals([{
			selectors: [
				".border"
			],
			values: [{
				name: "padding",
				value: "16px / 2"
			}, {
				name: "margin",
				value: "16px / 2"
			}]
		}], scssToDefinitions([
			'$margin: 16px;',
			'.border {',
			'  padding: $margin / 2;',
			'  margin: $margin / 2;',
			'}'
		]));

		return true;
	});

})(typeof window !== 'undefined' ? window : global);
