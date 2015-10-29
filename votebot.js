var request = require('request');
var vote = {};
var botPayload = {};
	botPayload.username = 'votebot';
	botPayload.icon_emoji = ':hand:';

module.exports = function(req, res, next) {
	if (req.body.text) {
		var params = req.body.text.split(' ');

		if (params[0] === 'start') { // start a vote
			startVote(req, res, next);
		}
		else if (params[0] === 'end') { // end a vote
			endVote(req, res, next);
		}
		else { // vote on a vote
			makeVote(req, res, next, params);
		}
	} else {
		// send error message back to user if input is bad
		return res.status(200).send('correct syntax hint');
	}
}

function startVote(req, res, next) {
	// write response message and add to payload
	questionText = req.body.text.match(/'([^']+)'/)[1];

	vote.questionText = questionText;
	vote.owner = req.body.user_id;
	vote.yes = 0;
	vote.no = 0;
	vote.voters = [];

	botPayload.text = req.body.user_name + " has started a vote!\n" + questionText + "\nTo vote, use '/vote {yes/no}'";
	botPayload.channel = req.body.channel_id;

	send(botPayload, function (error, status, body) {
		if (error) {
			return next(error);
		} else if (status !== 200) {
		// inform user that our Incoming WebHook failed
			return next(new Error('Incoming WebHook: ' + status + ' ' + body));
		} else {
			return res.status(200).end();
		}
	});
}

function endVote(req, res, next) {
	if (Object.keys(vote).length !== 0) { // if we actually have a vote
		if (req.body.user_id === vote.owner) {
			botPayload.text = "Vote results to " + vote.questionText + " yes: " + vote.yes + " no: " + vote.no;
			botPayload.channel = req.body.channel_id;
			vote = {};
		} else {
			return res.status(200).send('You are not the vote owner, you cannot end this vote');
		}
	} else {
		return res.status(200).send('There are no active votes!');
	}

	send(botPayload, function (error, status, body) {
		if (error) {
			return next(error);
		} else if (status !== 200) {
		// inform user that our Incoming WebHook failed
			return next(new Error('Incoming WebHook: ' + status + ' ' + body));
		} else {
			return res.status(200).end();
		}
	});
}

function makeVote(req, res, next, params) {
	var voter = req.body.user_id;
	for (var i = 0; i < vote.voters.length; i++) {
		if (voter === vote.voters[i]) { // this user has already voted
			return res.status(200).send('You have already voted!');
		}
	}
	// valid voter
	var votersVote = params[0];
	if (votersVote === 'yes') {
		vote.yes += 1;
	} else if (votersVote === 'no') {
		vote.no += 1;
	} else {
		return res.status(200).send("You voted " + votersVote + ". Please vote 'yes' or 'no'");
	}
	vote.voters.push(voter);
	return res.status(200).send('You voted ' + votersVote);
}

function send (payload, callback) {
	var path = process.env.INCOMING_WEBHOOK_PATH;
	var uri = 'https://hooks.slack.com/services/' + 'T0A6N8UG1/B0DEB3NS2/yTwdbPpxdFW0csjehx2xSbcZ';

	request({
		uri: uri,
		method: 'POST',
		body: JSON.stringify(payload)
	}, function (error, response, body) {
	if (error) {
		return callback(error);
	}

	callback(null, response.statusCode, body);
	});
}