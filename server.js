var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var serveStatic = require('serve-static');
var url = require('url');
var fs = require('fs');
var session = require('express-session');
var FileStore = require('session-file-store')(session);
var paypal = require('paypal-rest-sdk');

var app = express();

var config = JSON.parse( fs.readFileSync("config.json",'utf8') || "" );
/*
Sample config
{
	"port": 8090,
	"sitePath": "site",
	"adminPassword": "something",
	"contactEmail": "will.demarest@gmail.com",
	"mandrillApiKey": "",
	"credentialsFile": "credentials.json",
	"userDataFile": "userdata.json"
}
*/
var mkdirp = require('mkdirp');
if( !fs.existsSync('./sessions') ) {
	console.log("Creatingng /sessions directory.");
	mkdirp('./sessions', function(err) {
		if( err ) console.log(err);
	});
}

if( !fs.existsSync(config.credentialsFile) ) {
	console.log("Creating", config.credentialsFile);
	console.log("Filling with user 'admin'");
	fs.writeFileSync(config.credentialsFile,JSON.stringify({
		"admin": "" // the username 'admin' always is tested against 'config.adminPassword'
	},null,4));
}

if( !fs.existsSync(config.userDataFile) ) {
	console.log("Creating", config.userDataFile);
	console.log("Adding user data for 'admin'");
	fs.writeFileSync(config.userDataFile,JSON.stringify({
		"admin": {
			userName: "admin",
			userEmail: "",  
			progress: [],
			isAdmin: 1,
			isUnlocked: 1
		}
	},null,4));
}


// See https://developer.paypal.com
// See samples here: https://github.com/paypal/PayPal-node-SDK/tree/master/samples
//paypal.configure( fs.readFileSync('paypal_credentials.json', 'utf8') );

function escapeHtml(text) {
	var map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};

	return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function emailSubmit(req, res) {
	console.log("Emailing "+config.contactEmail);

	var email = require('mandrill-send')(config.mandrillApiKey);
	email({
		from: 'Candy Hop Contact Form <'+config.contactEmail+'>',
		to: [ config.contactEmail ],
		subject: req.body.subject,
		text: "From: "+req.body.name+"\nEmail: "+req.body.email+"\n"+req.body.message
	},
	function(err) {
		var response = {
			status: "Sent"
		};
		if( err ) {
			var msg = (err.data ? (err.data.message || err.data) : err);
			response = {
				error: JSON.stringify(msg)
			};
		}
		console.log( response);
		res.send( JSON.stringify(response) );
	});

}

function userDataRead(userName) {
	var userData = JSON.parse( fs.readFileSync(config.userDataFile,'utf8') || "{}" );
	if( userName === true ) {
		return userData;
	}
	return userData[userName];
}

function userDataWrite(userName,fn) {
	var userData = JSON.parse( fs.readFileSync(config.userDataFile,'utf8') || "{}" );
	userData[userName] = userData[userName] || { userName: '', userEmail: '', progress: [] };
	fn(userData[userName]);
	fs.writeFileSync(config.userDataFile,JSON.stringify(userData,null,4));
}

var progress = {};

progress.get = function(req,res) {
	//console.log('progress.get');
	var userName = req.session.userName;
	//console.log(userName);
	var userData = userDataRead(userName);
	//console.log(userData);
	res.send( userData.progress || [] );
}

progress.post = function(req,res) {

	var userName = req.session.userName;
	var level = req.body.level;
	if( level === undefined || level === null ) {
		return res.send( { result: 'failure', message: 'no level specified', detail: req.body } );
	}
	var points = req.body.points || 0;
	var stars = req.body.stars || 0;
	var userData = userDataRead(userName);
	var progress = userData.progress[level] || {points: 0, stars: 0, tries: 0};

	userDataWrite(userName,function(userData) {
		userData.progress = userData.progress || [];
		// Save this level's best progress
		userData.progress[level] = {
			points: Math.max(progress.points || 0, points),
			stars: Math.max(progress.stars || 0, stars),
			tries: (progress.tries || 0) + 1
		};
		// Open up the next level for play
		if( stars > 0 && (userData.progress[level+1] === undefined || userData.progress[level+1] === null) ) {
			userData.progress[level+1] = {
				points: 0,
				stars: 0,
				tries: 0
			};
		}
	});
	return res.send( { result: 'success' } );
}

var stats = {};
stats.get = function(req,res) {
    function fix(s,len) { return (s+'                    ').substr(0,len); }
	var userData = userDataRead(true);
	var head = [fix('USERNAME',16)];
	var sum = [];
	var count = [];
	var s = '';
	for( var userName in userData ) {
		var line = [fix(userName,16)];
		var progress = userData[userName].progress;
		for( var i=0 ; i<progress.length ; ++i ) {
            var tries = progress[i] ? progress[i].tries || 0 : '';
            if( tries ) {
                count[i] = (count[i] || 0) + 1;
                sum[i] = (sum[i] || 0) + tries;
            }
			line.push(tries);
			head[i] = head[i] || i;
		}
		s += line.join('\t')+'\n';
	}
	var avg = [fix('AVG',16)];
    for( var a=0 ; a<sum.length ; ++a ) {
        avg[a+1] = (sum[a] || 0) / (count[a] || 0.0001);
	}
	s += avg.join('\t')+'\n';
	s = '<pre>'+head.join('\t')+'\n'+s+'</pre>';
//	res.header("Content-Type", "text/plain");
	return res.end( s );
}

function login(req,res) {
	var userName = req.body.userName;
	var password = req.body.password;
	console.log("Login", userName, password);

	var credentials = JSON.parse( fs.readFileSync(config.credentialsFile,'utf8') || "{}" );
	if( credentials ) {
		credentials['admin'] = config.adminPassword;
	}
	console.log(credentials);

	var response = { result: 'failure' };
	if( !credentials ) {
		response.message = 'Unable to load credentials.';
	} else
	if( !credentials[userName] ) {
		response.message = 'Unknown user name.';
	} else
	if( credentials[userName] != password ) {
		response.message = 'Wrong password.';
	} else {
		response.result = 'success';
		response.message = 'Successful login.';
		var userData = userDataRead(userName);
		req.session.userEmail = userData.userEmail || '';
		req.session.userName = userData.userName || '';
		req.session.isAdmin = userData.isAdmin || 0;
		req.session.isUnlocked = userData.isUnlocked || 0;
	}

	console.log( response);
	res.send( JSON.stringify(response) );
}

function signup(req,res) {
	// only allow signup when an admin is logged in
	if( !req.session.isAdmin ) {
		return res.send( { result: 'failure', message: 'Signup not allowed except when logged in as admin.' } );
	}
	
	var userName = req.body.userName;
	var userEmail = req.body.userEmail;
	var password = req.body.password;
	var confirmation = req.body.confirmation;

	console.log("Signup", userEmail, userName);

	if( password != confirmation ) {
		return res.send( { result: 'failure', message: 'The password does not match the confirmation.' } );
	}

	if( password.length < 8 ) {
		return res.send( { result: 'failure', message: 'Password must be at least 8 characters.' } );
	}

	if( userName === '' ) {
		return res.send( { result: 'failure', message: 'Please enter a user name.' } );
	}

	if( userName.length > 16 ) {
		return res.send( { result: 'failure', message: 'That user name is too long. 16 characters or less please.' } );
	}

//	if( userName.match( /^[0-9a-zA-Z_]+$/ ) ) {
//		return res.send( { result: 'failure', message: 'User name must be a-z, A-Z, 0-9 and underscore.' } );
//	}

	var credentials = JSON.parse( fs.readFileSync(config.credentialsFile,'utf8') || "{}" );
	if( credentials[userName] ) {
		return res.send( { result: 'failure', message: 'Sorry that user name is already taken.' } );
	}

	credentials[userName] = password;
	fs.writeFileSync(config.credentialsFile,JSON.stringify(credentials,null,4));

	userDataWrite(userName,function(userData) {
		userData.userName = userName;
		userData.userEmail = userEmail;
	});

	return res.send( { result: 'success', message: 'Sign up complete!' } );
}


function logout(req,res) {
	console.log('logout');
	req.session.destroy();
	res.send( { result: 'success' } );
}

function serverStart() {
	config.port = config.port || 80;
	config.sitePath = config.sitePath || '.';
	var noAuthRequired = { '/login': 1, '/logout': 1, '/welcome.html': 1 };
	console.log("\n\nServing "+config.sitePath+" on "+config.port);

	app.use(session({
		store: new FileStore({ttl:60*60*24}),
		secret: 'sidehihcshhd',
		ttl: 60*60*24,
		resave: true,
		saveUninitialized: true
	}));

	app.use( function tellRequest( req, res, next ) {
		function startsWith(s,value) {
			return s.substr(0,value.length) == value;
		}
		if( !startsWith(req.url,'/image/') && !startsWith(req.url,'/sound/') ) {
			console.log(req.method, req.url);
		}
		next();
	});
	app.use( cookieParser() );
	app.use( bodyParser.json() );
	app.use( bodyParser.urlencoded({extended:false}) );
	app.locals.pretty = true;

	app.use( function ensureAuthenticated( req, res, next ) {
		var debug = false;
		if( debug ) console.log('ensureAuthenticated');
		var p = url.parse( req.url ).path;
		if( noAuthRequired[p] ) {
			if( debug ) console.log(p,'always allowed');
			return next();
		}
		if( req.session.userName ) {
			if( debug ) console.log(req.session.userName,'authorized');
			return next();
		}
		if( debug ) console.log('unauthorized. redirecting.');
		res.redirect('/welcome.html');
	});

	app.use( function setupCookies( req, res, next ) {
		//console.log('setupLocals');
		res.cookie('userName', req.session ? req.session.userName : null);
		res.cookie('isAdmin', req.session ? req.session.isAdmin : null);
		res.cookie('isUnlocked', req.session ? req.session.isUnlocked : null);
		res.cookie('userEmail', req.session ? req.session.userEmail : null);
		return next();
	});

	app.post( "/email", emailSubmit );
	app.post( "/login", login );
	app.post( "/logout", logout );
	app.post( "/signup", signup );
	app.get( "/progress", progress.get );
	app.post( "/progress", progress.post );
	app.get( "/stats", stats.get );

	app.get( "/after_payment", function(req,res,next) {
		res.send( "Payment Complete" );
	});

	app.use( serveStatic(config.sitePath, {'index': ['index.html']}) );

	app.theServer = http.createServer(app);
	app.theServer.listen(config.port);
}

var serverShutdown = function() {
	console.log("Server shutting down...");
	setTimeout(function() {
		console.error("Could not close connections in time, forcefully shutting down");
		process.exit(1)
	}, 3*1000);
	app.theServer.close(function() {
		console.log("Server stopped.");
		process.exit()
	});
}

process.on ('SIGTERM', serverShutdown);
process.on ('SIGINT', serverShutdown);

serverStart();
