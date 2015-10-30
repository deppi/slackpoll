var request = require('request');
var uuid = require('node-uuid');
var botPayload = {};
	botPayload.username = 'votebot';
	botPayload.icon_emoji = ':hand:';
var mongodb = require('mongodb');

var url = 'mongodb://root:index123@ds045684.mongolab.com:45684/mongoslack';

module.exports.postHandler = function(req, res, next) {
	if (req.body.text) {
		var params = req.body.text.split(' ');

		if (params[0] === 'start') { // start a vote
			startVote(req, res, next);
		}
		else if (params[0] === 'end') { // end a vote
			endVote(req, res, next);
		}
		else { // vote on a vote
			castVote(req, res, next, params);
		}
	} else {
		// send error message back to user if input is bad
		return res.status(200).send("Try /vote start 'question?' [vote option1, vote option2, ...]");
	}
}

module.exports.getHandler = function (req, res, next) {
    mongodb.MongoClient.connect(url, function(err, db) {
		var collection = db.collection('voting');
		collection.find({voteID: req.params.voteID}).toArray(function(err, doc) {
			if (err) {
				return res.status(200).send('No vote ID found');
			}
			res.header("Access-Control-Allow-Origin", "*");
		    res.header('Access-Control-Allow-Methods', 'GET');
		    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
			return res.status(200).send(JSON.stringify(doc[0]));
		});
	});
}

function startVote(req, res, next) {
	// write response message and add to payload
	var questionText = req.body.text.match(/'([^']+)'/)[1];
	var voteOptionsText = req.body.text.match(/\[(.*?)\]/)[1];
	var voteOptionsLoopText = req.body.text.match(/\[(.*?)\]/)[1].split(', ');
	var vote = {};
	vote.voteID = uuid.v4();
	vote.questionText = questionText;
	vote.ownerID = req.body.user_id;
	vote.votes = {};

	for (var i = 0; i < voteOptionsLoopText.length; i++) {
		vote.votes[voteOptionsLoopText[i].toLowerCase()] = [];
	}

	botPayload.text = req.body.user_name + " has started a <http://localhost:8000/app/index.html#/vote/voteHash/" + vote.voteID + "|vote>!\n" + 
					questionText + "\nVote with one of the following options:\n" 
					+ voteOptionsText + "\n/vote  " + vote.voteID + " <your_vote>";	
	botPayload.channel = req.body.channel_id;

	mongodb.MongoClient.connect(url, function(err, db) {

	var collection = db.collection('voting');
		collection.insert(vote, function(err, result) {
			db.close();
			send(botPayload, function (error, status, body) {
				if (error) {
					return next(error);
				} else if (status !== 200) {
				// inform user that our Incoming WebHook failed
					return next(new Error('Incoming WebHook: ' + status + ' ' + body));
				} else {
					setTimeout(function () {
						endVoteHelper(req, res, next, vote.voteID, vote.ownerID, true);
					}, 1000 * 1800);
					return res.status(200).send('Use "/vote end ' + vote.voteID + '" to end the vote.');
				}
			});
		});
	});
}

function endVote(req, res, next) {
	var voteID = req.body.text.split(' ')[1] || "";
	var ownerID = req.body.user_id;

	if (voteID === "") {
		return res.status(200).send('Please use /vote end {vote_ID}');
	}

	endVoteHelper(req, res, next, voteID, ownerID);
}

function endVoteHelper(req, res, next, voteID, ownerID, cameFromTimeout) {
	mongodb.MongoClient.connect(url, function(err, db) {
		var collection = db.collection('voting');
		collection.find({voteID: voteID, ownerID: ownerID}).toArray(function(err, doc) {
			if (doc.length === 0) {
				db.close();
				if (cameFromTimeout) return res.status(200).end();
				return res.status(200).send('Please double check your vote ID. You cannot end a vote you did not start.');
			} else {
				collection.deleteOne({voteID: voteID});
				var voteResultsText = "";
				var vote = doc[0];
				for (var voteOption in vote.votes) {
					voteResultsText += voteOption + " " + vote.votes[voteOption].length + " ";
				}
				botPayload.text = "Vote results to " + vote.questionText + " " + voteResultsText;
		 		botPayload.channel = req.body.channel_id;
		 		db.close();
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
		});
	});
}

function castVote(req, res, next, params) {
	var voter = req.body.user_id;
	var splitText = req.body.text.split(' ');
	var voteID = splitText[0];
	var voteOption = splitText[1];

	voteOption = voteOption.toLowerCase();

	mongodb.MongoClient.connect(url, function(err, db) {
		var collection = db.collection('voting');
		collection.find({voteID: voteID}).toArray(function(err, doc) {
			if (doc.length === 0) {
				db.close();
				return res.status(200).send('Please double check your vote ID. You cannot vote on a vote that does not exist');
			} else {
				var vote = doc[0];
				if (!vote.votes.hasOwnProperty(voteOption)) {
					return res.status(200).send('Invalid vote option');
				} 
				for (var loopVoteOption in vote.votes) {
					for (var i = 0; i < vote.votes[loopVoteOption].length; i++) {
						if (voter === vote.votes[loopVoteOption][i]) {
							return res.status(200).send('You already voted: ' + loopVoteOption);
						}
					}
				}
				vote.votes[voteOption].push(voter);
				collection.updateOne({voteID: voteID}, { $set: {votes: vote.votes} });
				
		 		db.close();
		 		return res.status(200).send('You voted: ' + voteOption);
			}
		});
	});
}

function getVotes(voteID) {

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