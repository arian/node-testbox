
// express app
var app = require('./index')
	.set('testbox path', __dirname + '/tests')
	.set('testbox tests', ['math', 'DOM'])

