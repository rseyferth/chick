'use strict';
(function(ns) {

	function TriggerClass() {

	}

	ns.register('Core.TriggerClass', TriggerClass);


	TriggerClass.prototype.on = function(eventName, callback) {
		this.__callbacks[eventName].push(callback);		
		return this;
	};

	TriggerClass.prototype.once = function(eventName, callback) {
		this.__callbacksOnce[eventName].push(callback);		
		return this;
	};


	TriggerClass.prototype.trigger = function(eventName) {
		var args = [];
		if (arguments.length > 1) {
			for (var i = 1; i < arguments.length; i++) {
				args.push(arguments[i]);
			}
		}
		var instance = this;
		_.each(this.__callbacks[eventName], function(callback) {
			callback.apply(instance, args);
		});
		_.each(this.__callbacksOnce[eventName], function(callback) {
			callback.apply(instance, args);
		});
		this.__callbacksOnce[eventName] = [];
		return this;
	};
	TriggerClass.prototype.__registerEvents = function(names) {
		if (this.__callbacks === undefined)	this.__callbacks = {};
		if (this.__callbacksOnce === undefined)	this.__callbacksOnce = {};
		for (var s in names) {
			this.__callbacks[names[s]] = [];
			this.__callbacksOnce[names[s]] = [];
		}
	};

})(Chick);