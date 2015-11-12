'use strict';
(function() {

	window.Chick = window.Chick || {};

	// Enable Underscore.string extension
	_.mixin(s.exports());

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

	Chick.registerModel = function(ns, data) {
		return Chick.register('Models.' + ns, Chick.Core.Model, data);
	};


	Chick.knows = function(ns) {
		var obj = Chick.arrayGet(Chick, ns, false);
		return obj !== false;
	};

	Chick.createModel = function(className, startValues) {
		return Chick.Core.Model.create(className, startValues);
	};


	Chick.view = function(name) {
		return Chick.Gui.View.make(name);
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

	Chick.enableContent = function($target, context) {

		for (var c in Chick.__contentProcessors) {
			Chick.__contentProcessors[c]($target, context);
		}

	};



	Chick.redirect = function(url) {
		return new Chick.Core.Redirect(url);
	};



	var dot = new DotObject();
	window.dot = dot;



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



	////////////////
	// DIRECTIVES //
	////////////////

	Chick.directiveClasses = {};
	Chick.createdDirectives = [];
		

	Chick.registerDirective = function(tag, classObj, constructor) {

		// Register as class
		classObj = Chick.register('Chick.Directives.' + _.classify(tag), Chick.Gui.Directive, classObj);

		// Add constructor
		classObj.prototype.__construct = constructor;

		// Register as directive
		Chick.directiveClasses[tag] = classObj;
		return classObj;

	};

	Chick.getDirectiveInstance = function(index) {

		return Chick.createdDirectives[index];

	};


	///////////////////
	// Broadcasting. //
	///////////////////

	var broadcastListeners = {};
	Chick.broadcast = function(name, args, context) {

		// Listeners?
		if (broadcastListeners[name] === undefined) return;
		_.each(broadcastListeners[name], function(cb) {

			cb.apply(context, args);

		});

	};

	Chick.listen = function(name, cb) {

		// Add the callback
		if (broadcastListeners[name] === undefined) broadcastListeners[name] = [];
		broadcastListeners[name].push(cb);

	};

	Chick.unlisten = function(name, cb) {

		if (broadcastListeners[name] === undefined) return;
		broadcastListeners[name] = _.without(broadcastListeners[name], cb);

	};





})();
