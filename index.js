
var fs       = require('fs'),
    qs       = require('querystring'),
    path     = require('path'),
    repl     = require('repl'),
    express  = require('express'),
    mime     = require('mime'),
    ejs      = require('ejs'),
    wrapup   = require('wrapup'),
    socketio = require('socket.io'),
    colors   = require('colors')

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
var capture = ~process.argv.indexOf('--capture')
app.set('testbox log', !capture)
app.set('testbox capture', capture)
app.set('testbox capture timeout', 30e3)

// default
app.get('/', function(req, res){
	res.render('index', {
		tests: app.set('testbox tests'),
		capture: app.set('testbox capture')
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
console.log('Test server listening on port 3000'.cyan)

// socket.io connection
if (app.set('testbox capture')){

	var sockets = [],
		io = socketio.listen(app),
		replServer = repl.start('testbox >'),
		results = [],
		logs = 0,
		timeout

	console.log('write '.cyan + '.test'.bold.cyan + ' to reload all connected browsers'.cyan)
	replServer.displayPrompt()

	var logResults = function(){

		clearTimeout(timeout)
		console.log('\n')

		results.forEach(function(result){
			if (!result) return
			if (result.failures){
				console.log(('✗ (' + result.failures + ') ' + result.ua).bold.red)
			} else {
				console.log(('✓    ' + result.ua + '').green)
			}
		})

		replServer.displayPrompt()
	}

	io.set('log level', 1);
	io.sockets.on('connection', function (socket){
		sockets.push(socket)

		socket.on('disconnect', function(){
			var index = sockets.indexOf(socket)
			if (~index) sockets.splice(index, 1)
		})

		socket.on('results', function(result){
			var index = sockets.indexOf(socket)
			results[index] = result
			if (++logs == sockets.length) logResults()
		})
	})

	replServer.defineCommand('test', {
		help: 'This will reload all registered browsers and run the tests',
		action: function(){

			logs = 0
			results = []

			console.log(('Testing with ' + sockets.length + ' connections').bold.yellow)

			sockets.forEach(function(socket){
				socket.emit('reload');
			});

			// timeout after 30 seconds
			timeout = setTimeout(logResults, app.set('testbox capture timeout'))

		}
	})

}


module.exports = app

