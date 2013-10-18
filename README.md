# Kerio SASS.js

## Usage

```
var scss = require('kerio-sass-js');

var text = '/* SCSS */ h1 { color: red; }';
scss.process(text);

console.log(scss.definitions); // use before .toCss()
console.log(scss.toCss());     // .definitions are empty after calling this
```

See live demo [here](http://kerio.github.io/kerio-sass-js/).

## Run tests

```
npm test
```
