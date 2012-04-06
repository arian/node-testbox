
var fs      = require('fs')
var qs      = require('querystring')
var path    = require('path')
var express = require('express')
var mime    = require('mime')
var ejs     = require('ejs')
var wrapup  = require('wrapup')

// runner settings
var app = express.createServer()
	.use(express.bodyParser())
	.set('views', __dirname + '/views')
	.set('view engine', 'ejs')
	.set('view options', {
		layout: false
	})
	.use(express.errorHandler({
		showStack: true,
		dumpExceptions: true
	}))

// testbox settings
app.set('testbox path', __dirname + '/tests')
app.set('testbox tests', [])
app.set('testbox log', true)

// default
app.get('/', function(req, res){
	res.render('index', {
		tests: app.set('testbox tests')
	})
})

// sandboxed test
app.get('/test.html', function(req, res){
	res.render('test')
})

// wrup tests with wrapup
app.get('/test.js', function(req, res, next){
	if (!req.query.test) next(new Error('the "test" parameter should be in the query string'))

	var wrup = wrapup()
	var test = path.resolve(app.set('testbox path'), req.query.test + '.js')
	if (app.set('testbox log')) console.log("wrup'ing %s", test)
	var js = wrup.require('test', test)

	if (js){
		res.header('Content-Type', 'text/javascript')
		res.send(js.up())
	} else {
		res.send("Error", 500)
		wrup.log("ERROR: ")
	}
})

// static JS files from node_modules
var staticInNodeModules = {
	'/expect.js': __dirname + '/node_modules/expect.js/expect.js',
	'/mocha.js': __dirname + '/node_modules/mocha/mocha.js',
	'/mocha.css': __dirname + '/node_modules/mocha/mocha.css'
}
for (var staticFile in staticInNodeModules) (function(path, file){
	app.get(path, function(req, res, next){
		fs.readFile(file, function(err, data){
			if (err) next(err)
			else {
				res.header('Content-Type', mime.lookup(file))
				res.send(String(data))
			}
		})
	})
})(staticFile, staticInNodeModules[staticFile])

// start server
app.listen(3000)
console.log('Test server listening on port 3000')

module.exports = app

