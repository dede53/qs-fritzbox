var request 					= require('request');
var net 						= require('net');
var events 						= require('events');

var CallMonitor = function (host, port) {
	var self = this;
	self.call = {};

	var port = port || 1012;

	function fritzboxDateToUnix(string) {
		var d = string.match(/[0-9]{2}/g);
		var result = '';
		result += '20' + d[2] + '-' + d[1] + '-' + d[0];
		result += ' ' + d[3] + ':' + d[4] + ':' + d[5];
		return Math.floor(new Date(result).getTime() / 1000);
	}

	function parseMessage(buffer) {
		var message = buffer.toString()
									.toLowerCase()
									.replace(/[\n\r]$/, '')
									.replace(/;$/, '')
									.split(';');
		message[0] = fritzboxDateToUnix(message[0]);
		return message;
	}

	var client = net.createConnection(port, host);
	client.addListener('data', function (chunk) {
		var data = parseMessage(chunk);
		if (data[1] === 'ring') {
			self.call[data[2]] = {
				type: 'inbound',
				start: data[0],
				caller: data[3],
				called: data[4]
			};
			self.emit('inbound', {
				time: data[0],
				caller: data[3],
				called: data[4]
			});
			return;
		}

		if (data[1] === 'call') {
			self.call[data[2]] = {
				type: 'outbound',
				start: data[0],
				extension: data[3],
				caller: data[4],
				called: data[5]
			};
			self.emit('outbound', {
				time: data[0],
				extension: data[3],
				caller: data[4],
				called: data[5]
			});
			return;
		}

		if (data[1] === 'connect') {
			self.call[data[2]]['connect'] = data[0];
			self.emit('connected', {
				time: data[0],
				extension: self.call[data[2]]['extension'],
				caller: self.call[data[2]]['caller'],
				called: self.call[data[2]]['called']
			});
			return;
		}

		if (data[1] === 'disconnect') {
			self.call[data[2]].disconnect = data[0];
			self.call[data[2]].duration   = parseInt(data[3], 10);

			var call = self.call[data[2]];
			delete(self.call[data[2]]);
			self.emit('disconnected', call);
			return;
		}

	});

	client.addListener('end', function () {
		client.end();
	});

	client.addListener('error', function (err) {
		if(err.code = 'ECONNREFUSED'){
			helper.log.error('Die fritzbox ('+ err.address +':'+err.port+') kann nicht erreicht werden!');
			helper.log.error('Ist der CallMonitor aktiv?');
			helper.log.error('Zum Aktivieren #96*5* anrufen');
		}else{
			console.log(err);
		}
			
	});
};

CallMonitor.prototype = new events.EventEmitter();

module.exports = CallMonitor;