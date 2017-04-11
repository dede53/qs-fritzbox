var fritz 						= require('fritzapi');
var adapter 					= require('../../adapter-lib.js');
var avm_fritz					= new adapter("fritzbox");
if(avm_fritz.settings.ip){
	var fritte						= new fritz.Fritz(avm_fritz.settings.user, avm_fritz.settings.password, avm_fritz.settings.ip);
}else{
	var fritte						= new fritz.Fritz(avm_fritz.settings.user, avm_fritz.settings.password);
}

process.on('message', function(request) {
	var status = request.status;
	var data = request.data;
	switch(data.protocol){
		case "switchDect":
			fritzdect(status, data);
			break;
		case "setGuestWlan":
			setGuestWlan(status);
			break;
	};
});

function setGuestWlan(status){
	if(status == 1){
		var status = true;
	}else{
		var status = false;
	}
	fritte.setGuestWlan(status).then(function(enabled){
		avm_fritz.log.debug("Gast-WLAN aktiv: " + enabled.activate_guest_access);
		avm_fritz.log.pure(enabled);
	});
}

function fritzdect(status, data){
	if(status == 1){
		fritte.setSwitchOn(data.CodeOn).then(function(){
			avm_fritz.log.debug("Erfolgreich eingeschaltet");
		});
	}else{
		fritz.setSwitchOff(data.CodeOn).then(function(sid){
			avm_fritz.log.debug("Erfolgreich ausgeschaltet");
		});
	}
}

var CallMonitor					= require('./callmonitor.js');
var monitor = new CallMonitor(avm_fritz.settings.ip || 'fritz.box', avm_fritz.settings.port);

monitor.on('inbound', function (call) {
	avm_fritz.log.debug("klingelt:" + call.caller);
	avm_fritz.setVariable("fritzbox.status", "klingelt");
	avm_fritz.setVariable("fritzbox.lastCaller", call.caller);
	avm_fritz.setVariable("fritzbox.lastCall", new Date());
});

monitor.on('outbound', function (call) {
	avm_fritz.log.debug("ausgehend");
	avm_fritz.setVariable("fritzbox.status", "ausgehend");
});

monitor.on('connected', function (call) {
	avm_fritz.log.debug("eingehend");
	avm_fritz.setVariable("fritzbox.status", "angenommen");
});

monitor.on('disconnected', function (call) {
	avm_fritz.log.debug("aufgelegt");
	avm_fritz.setVariable("fritzbox.status", "aufgelegt");
});

monitor.on('error', function(err){
	if(err.code = 'ECONNREFUSED'){
		process.send({"statusMessage":"error:" + err});
		avm_fritz.log.error('Die fritzbox ('+ err.address +':'+err.port+') kann nicht erreicht werden!');
		avm_fritz.log.error('Ist der CallMonitor aktiv?');
		avm_fritz.log.error('Zum Aktivieren #96*5* anrufen');
	}else{
		avm_fritz.log.error(err);
	}
});

function mdyToDate(mdy) {
	var d = mdy.split('.', 4);
	var m = d[3].split(":", 2);

	if (d.length != 4 || m.length != 2){
		return null;
	}
	// Check if date is valid
	var mon = parseInt(d[1]); 
	var	day = parseInt(d[0]);
	var	year= parseInt(d[2]);
	var hour = parseInt(m[0]);
	var min = parseInt(m[1]);
	if (d[2].length == 2) year += 2000;{
		if (day <= 31 && mon <= 12 && year >= 2015){
			return new Date(year, mon - 1, day, hour, min);
		}
	}
	return null;
}