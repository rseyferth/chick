'use strict';
window.Chick = window.Chick || {};

Chick.register = function(ns, dataOrParentClass, dataOrNull) {

	// Parent class used?
	var data = dataOrNull === undefined ? dataOrParentClass : dataOrNull,
		parentClass = dataOrNull === undefined ? false : dataOrParentClass;

	// Extending
	if (parentClass) {
		data.prototype = Object.create(parentClass.prototype);
		data.prototype.constructor = data;
	}


	// Split namespace on dots
	var parts = ns.split('.'),
		obj = window.Chick;
	if (parts.length > 1) {
		for (var p = 0; p < parts.length - 1; p++) {
			if (obj[parts[p]] === undefined) obj[parts[p]] = {};
			obj = obj[parts[p]];
		}
	}
	obj[parts[parts.length - 1]] = data || {};
	return obj[parts[parts.length - 1]];

};

Chick.registerController = function(ns, data) {
	return Chick.register(ns, Chick.Core.Controller, data);
};

Chick.knows = function(ns) {
	var obj = Chick.arrayGet(Chick, ns, false);
	return obj !== false;
};


Chick.promise = function() {
	return $.Deferred();
};
Chick.isPromise = function(obj) {
	return typeof obj === 'object' && typeof obj.then === 'function';
};
Chick.isArray = function(obj) {
	return $.isArray(obj);
};


Chick.when = function(promises) {	
	return $.when.apply(null, promises);
};
	

Chick.uuid = function(format) {

	if (format === undefined) format = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
	var d = new Date().getTime(),
		uuid = format.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
	});
		return uuid;

};

Chick.extend = function() {
	return $.extend.apply(this, arguments);
};


Chick.arrayGet = function(obj, key, def, regex) {

	if (regex === undefined) regex = /\./;
	if (def === undefined) def = '[' + key + ']';
	var parts = key.split(regex);

	for (var p in parts) {
		if (obj[parts[p]] === undefined) return def;
		obj = obj[parts[p]];
	}
	return obj;

};


Chick.__contentProcessors = [];
Chick.registerContentProcessor = function(callback) {
	Chick.__contentProcessors.push(callback);
};

Chick.enableContent = function($target) {

	for (var c in Chick.__contentProcessors) {
		Chick.__contentProcessors[c]($target);
	}

};



Chick.redirect = function(url) {
	return new Chick.Core.Redirect(url);
};





/**
 * Polyfill for Object.create() OOP
 */
if (typeof Object.create !== 'function') {
	Object.create = (function() {
		var Object = function() {};
		return function (prototype) {
			if (arguments.length > 1) {
				throw new Error('Second argument not supported');
			}
			if (typeof prototype !== 'object') {
				throw new TypeError('Argument must be an object');
			}
			Object.prototype = prototype;
			/* jshint ignore:start */
			var result = new Object();
			Object.prototype = null;
			return result;
			/* jshint ignore:end */
		};
	})();
}


/**
 * Polyfill for Console
 */
if (window.console === undefined) {
	window.console = {
		log: function() {},
		warn: function() {},
		error: function() {}
	};
}