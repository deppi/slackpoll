var Tail = require('tail').Tail;
var request = require('request');
var fileToTail = '//1.1.10.242/guiapp/opt/searhaack/log/searhaack.log';
var lineSeparator;
var reqRegex = new RegExp("Request");
var resRegex = new RegExp("response");
var reqMap = {};

var logFileConfigs = {
	'viper-error': {
		fileName: '//1.1.10.240/gui/opt/viper/logs/error.log',
		handler: watchViperError,
		logging: false,
		tailInstance: undefined
	},
	'searhaack': {
		fileName: '//1.1.10.242/guiapp/opt/searhaack/log/searhaack.log',
		handler: watchSearhaack,
		logging: false,
		tailInstance: undefined
	}
};

var watchSearhaack = function (data) {
	var parsedJSON = getJSON(data);
	var payload = {};

	payload.username = 'AlertBot';
	payload.icon_emoji = ':rotating_light:';
	console.log(parsedJSON);
	if (parsedJSON) {
		handleJSON(parsedJSON, payload);
		return;
	}

	if (reqRegex.test(data)) {
		var parsedData = data.split(' ');
		var reqID = parsedData[9].replace(':', '');
		// console.log("Parse req: ", parsedData);
		console.log("REQ ID: ", reqID);
		reqMap[reqID] = {
			ipAddr: parsedData[12],
			route: parsedData[10],
			time: parsedData.slice(0, 6).join(' ')
		};
	} else if (resRegex.test(data)) {
		handleResponse(data, payload);
	} else {
		console.log("LOG: ", data);
	}
};

var watchViperError = function () {
	return;
};

var handleResponse = function (data, payload) {
	var parsedData = data.split(' ');
	var msResponseTime = parseInt(parsedData[2].replace('ms'), 10);
	var reqID = parsedData[1];
	var reqData;

	console.log("RESPONSE TIME: ", msResponseTime);
	if (reqMap.hasOwnProperty(reqID)) {
		reqData = reqMap[reqID];
		// console.log("GET REQ DATA: ", reqMap[reqID]);
	} else {
		console.log("There was an unmapped requestID: ", reqID);
	}
	if ( msResponseTime > 3000) {
		payload.text = 'Warn: An API response time of greater than 3 seconds (' + msResponseTime/1000 + 's) for IP ' + reqData.ipAddr + ' requesting ' + reqData.route + ' route on ' + reqData.time + '.';
		send(payload);
	}
};

var send = function (payload) {
	var path = process.env.INCOMING_WEBHOOK_PATH;
	var uri = 'https://hooks.slack.com/services/' + 'T0A6N8UG1/B0DEB3NS2/yTwdbPpxdFW0csjehx2xSbcZ';

	request({
		uri: uri,
		method: 'POST',
		body: JSON.stringify(payload)
	}, function (error, response, body) {
		// console.log(response);
		if (error) {
			return console.log(error);
		}
	});
};

var getJSON = function (str) {
	var json;
	try {
		json = JSON.parse(str);
	} catch (e) {
		return false;
	}
	return json;
};

var handleJSON = function (json, payload) {
	if (json.hasOwnProperty('event')) {
		var ev = json.event;
		switch (ev) {
		case 'uilog' : {
			payload.text = 'LOG: ' + json.data;
			send(payload);
		}
		}
	}
};

exports.watchHandler = function (req, res, next) {
	var params,
		logFileID,
		logging;

	if (!req.body.text) {
		return res.status(200).send('correct syntax hint');
	}

	params = req.body.text.split(' ');
	logFileID = params[0];
	logging = (params[1] && params[1] === 'stop') ? false : true;

	if (!logFileConfigs.hasOwnProperty(logFileID)) {
		return res.status(200).send('logFileID not in config');
	}

	logFileConfig = logFileConfigs[logFileID];

	if (logFileConfig.tailInstance === undefined) {
		logFileConfig.tailInstance = new Tail(logFileConfig.fileName);
		if (logFileConfig.handler === undefined) {
			logFileConfig.tailInstance.on("line", defaultHandler);
		} else {
			logFileConfig.tailInstance.on("line", logFileConfig.handler);
		}
	}

	if (logging) {
		logFileConfig.tailInstance.watch();
		res.status(200).send('Start tailing: ' + logFileConfig.fileName);
	} else {
		logFileConfig.tailInstance.unwatch();
		res.status(200).send('Stop tailing: ' + logFileConfig.fileName);
	}
};
