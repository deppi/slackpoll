var hellobot = require('./hellobot');
var dicebot = require('./dicebot');
var votebot = require('./votebot');
var monitor = require('./monitor');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();
var port = process.env.PORT || 3000;
// body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

// test route
app.get('/', function (req, res) { res.status(200).send('Hello world!') });

// error handler
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(400).send(err.message);
});

app.listen(port, function () {
  console.log('Slack bot listening on port ' + port);
});

app.post('/hello', hellobot);
app.post('/roll', dicebot);
app.post('/vote', votebot.postHandler);
app.get('/vote/:voteID', votebot.getHandler)
app.post('/log', monitor.watchHandler);
