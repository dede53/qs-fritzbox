var fritz 						= require('smartfritz');
var adapter 					= require('../../adapter-lib.js');
var CallMonitor					= require('./callmonitor.js');
var avm_fritz					= new adapter({
	"name": "fritzbox",
	"loglevel": 1,
	"description": "Sammelt Informationen von der Fritzbox.",
	"settingsFile": "fritzbox.json"
});

process.on('message', function(data) {
	var status = data.status;
	var data = data.data;
	fritzdect(status, data);
});

function fritzdect(status, data){
	fritzboxConnect(function(sid){
		if(status == 1){
			fritz.setSwitchOn(sid, data.CodeOn, function(sid){
				avm_fritz.log.debug("Erfolgreich eingeschaltet");
			});
		}else{
			fritz.setSwitchOff(sid, data.CodeOn, function(sid){
				avm_fritz.log.debug("Erfolgreich ausgeschaltet");
			});
		}
	});
}

function fritzboxConnect(callback){
	var moreParam = { url: avm_fritz.settings.ip };
	fritz.getSessionID(avm_fritz.settings.user, avm_fritz.settings.password, function(sid){
		console.log("Fritzbox Session ID: " + sid);
		if(sid == "0000000000000000"){
			console.log("Kann keine Verbindung zur Fritzbox herstellen!");
		}else{
			callback(sid);
		}
	}, moreParam);
}

function getPhonelist(){
	fritzboxConnect(function(sid){
		fritz.getPhoneList(sid,function(listinfos){
			if(listinfos.length != 0){
				if(listinfos.length < avm_fritz.settings.phonelistLength){
					var items = listinfos.length;
				}else{
					var items = avm_fritz.settings.phonelistLength;
				}
				var call = new Array;
				for(var i = 0; i< items; i++){
					var duration = listinfos[i].duration.split(":", 2);
					if(duration[0] == 0){
						listinfos[i].duration = undefined; 
					}else{
						listinfos[i].duration = duration[0];
					}
					listinfos[i].durationminutes = duration[1];
					listinfos[i].date = mdyToDate(listinfos[i].date + "." + listinfos[i].time);
					call.push(listinfos[i]);
				}
				avm_fritz.setVariable('fritzbox.phonelist', call);
				// callback(call);
			}
		});
	});
}

var monitor = new CallMonitor(avm_fritz.settings.ip, avm_fritz.settings.port);

monitor.on('inbound', function (call) {
	avm_fritz.log.debug("klingelt:" + call.caller);
	avm_fritz.setVariable("fritzbox.lastCaller", call.caller);
	avm_fritz.setVariable("fritzbox.status", "klingelt");
	getPhonelist();
});

monitor.on('outbound', function (call) {
	avm_fritz.log.debug("ausgehend");
	avm_fritz.setVariable("fritzbox.status", "ausgehend");
	getPhonelist();
});

monitor.on('connected', function (call) {
	avm_fritz.log.debug("eingehend");
	avm_fritz.setVariable("fritzbox.status", "angenommen");
	getPhonelist();
});

monitor.on('disconnected', function (call) {
	avm_fritz.log.debug("aufgelegt");
	avm_fritz.setVariable("fritzbox.status", "aufgelegt");
	getPhonelist();
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