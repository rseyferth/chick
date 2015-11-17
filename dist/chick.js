'use strict';
(function() {

	window.Chick = window.Chick || {};

	// Enable Underscore.string extension
	_.mixin(window.s.exports());

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


	Chick.isModel = function(obj) {
		return typeof obj === 'object' && Chick.Core.Model.prototype.isPrototypeOf(obj);
	};
	Chick.isCollection = function(obj) {
		return typeof obj === 'object' && Chick.Core.Collection.prototype.isPrototypeOf(obj);
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
	Chick.gotoUri = function(url) {
		url = Chick.url(url);
		return Chick.app.router.open(url);
	};


	var dot = new window.DotObject();
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
		classObj = Chick.register('Directives.' + _.classify(tag), Chick.Gui.Directive, classObj);

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

	Chick.listen = function(names, cb) {

		// Split it.
		if (typeof names === 'string') {
			names = names.split(/\s*,\s*/);
		}
		
		// Add the callback
		_.each(names, function(name) {

			if (broadcastListeners[name] === undefined) broadcastListeners[name] = [];
			broadcastListeners[name].push(cb);

		});

	};

	Chick.unlisten = function(name, cb) {

		if (broadcastListeners[name] === undefined) return;
		broadcastListeners[name] = _.without(broadcastListeners[name], cb);

	};





})();

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

	TriggerClass.prototype.triggerAndReturn = function(eventName) {

		var args = [];
		if (arguments.length > 1) {
			for (var i = 1; i < arguments.length; i++) {
				args.push(arguments[i]);
			}
		}
		var instance = this,
			results = [];
		_.each(this.__callbacks[eventName], function(callback) {
			results.push(callback.apply(instance, args));
		});
		_.each(this.__callbacksOnce[eventName], function(callback) {
			results.push(callback.apply(instance, args));
		});
		this.__callbacksOnce[eventName] = [];
		return results.filter(function(item) { return item !== undefined; });


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
'use strict';
(function(ns) {

	function Promise() {

	}

	Promise.prototype.resolve = function() {
		this.__init();
		if (this.__isResolved || this.__isRejected) throw new Error('A Promise can only be resolved or rejected once.');
		this.__isResolved = true;
		this.__result = arguments;
		this.__callListeners('resolve');
		return this;
	};
	Promise.prototype.reject = function() {
		this.__init();
		if (this.__isResolved || this.__isRejected) throw new Error('A Promise can only be resolved or rejected once.');
		this.__isRejected = true;
		this.__result = arguments;
		this.__callListeners('reject');
		return this;
	};



	Promise.prototype.then = function(doneCallback, failCallback) {
		if (doneCallback !== undefined) this.__addListener('resolve', doneCallback);
		if (failCallback !== undefined) this.__addListener('reject', failCallback);
		return this;
	};

	Promise.prototype.always = function(callback) {
		this.__addListener('any', callback);
		return this;
	};

	Promise.prototype.done = function(callback) {
		this.__addListener('resolve', callback);
		return this;
	};
	Promise.prototype.fail = function(callback) {
		this.__addListener('reject', callback);
		return this;
	};


	Promise.prototype.__init = function() {
		if (this.__initialized === true) return;

		this.__isResolved = false;
		this.__isRejected = false;
		this.__result = undefined;

		this.__resolveListeners = [];
		this.__rejectListeners = [];
		this.__anyListeners = [];
		
		this.__initialized = true;
	};


	Promise.prototype.__callListeners = function(type) {
		var listeners = type === 'resolve' ? this.__resolveListeners : this.__rejectListeners;
		listeners = listeners.concat(this.__anyListeners);
		for (var i in listeners) {
			listeners[i].apply(null, this.__result);
		}
	};

	Promise.prototype.__addListener = function(type, callback) {

		this.__init();

		// Already resolved?
		if ((this.__isResolved && type === 'resolve') || 
			(this.__isRejected && type === 'reject') || 
			((this.__isRejected || this.__isResolved) && type === 'any')) {

			// Do the callback now
			callback.apply(null, this.__result);

		} else {

			// Find proper array
			if (type === 'resolve') {
				this.__resolveListeners.push(callback);
			} else if (type === 'reject') {
				this.__rejectListeners.push(callback);
			} else if (type === 'any') { 
				this.__anyListeners.push(callback);
			}

		}

	};




	ns.register('Core.Promise', Promise);

})(Chick);
'use strict';
(function(ns) {

	function Model() {

		this.__init();

	}

	ns.register('Core.Model', Model);


	// Register models NS
	if (ns.Models === undefined) ns.Models = {};


	Model.prototype.deserialize = function(data) {

		// Set attributes
		_.extend(this.__attributes, data);

		// Was there a link available
		if (this.__attributes.links !== undefined) {

			// Remove it and store as links
			_.extend(this.__links, this.__attributes.links);
			delete this.__attributes.links;

		}

	};

	Model.prototype.get = function(key) {
		
		// Dots?
		if (key.indexOf('.') > 0) {
			
			// Loop through values
			var obj = this,
				keys = key.split('.'),
				specialPattern = /^{([a-zA-Z0-9]+)}$/;
			for (var i = 0; i < keys.length; i++) {
				

				// A special key?
				if (specialPattern.test(keys[i])) {
					
					// Check which command was used
					var command = specialPattern.exec(keys[i])[1];
					if (command === 'last') {
						if (ns.Core.Collection.prototype.isPrototypeOf(obj)) {
							obj = obj.last();
						} else {
							obj = _.last(obj);
						}
					} else if (command === 'first') {
						if (ns.Core.Collection.prototype.isPrototypeOf(obj)) {
							obj = obj.first();
						} else {
							obj = _.first(obj);
						}
					} else if (command === 'all') {

						// We will use the array itself
						
					} else {
						if (ns.Core.Collection.prototype.isPrototypeOf(obj)) {
							obj = obj.get(command);
						} else {
							obj = obj[command];
						}
					}

				} else {
					
					// Is the obj an array of models?
					var keyLeft;
					if (ns.isArray(obj)) {

						// Create an arrayed result
						keyLeft = keys.slice(i, keys.length).join('.');
						return _.map(obj, function(item) {
							return item.get(keyLeft);
						}); 

					// Is the obj a collection?
					} else if (ns.Core.Collection.prototype.isPrototypeOf(obj)) {

						// Create an arrayed result
						keyLeft = keys.slice(i, keys.length).join('.');
						return obj.map(function(item) {
							return item.get(keyLeft);
						});

					}

					// Nothing here?
					if (obj === undefined) {
						return null;
					}
					
					// Is the value just an ordinary object
					if (!ns.Core.Model.prototype.isPrototypeOf(obj)) {
						obj = obj[keys[i]];
						continue;
					}

					// It is a model
					obj = obj.get(keys[i]);
					
				}
			}
			return obj;
			
		}

		// A function defined?
		var funcName = 'get' + inflection.camelize(key);
		if (typeof this[funcName] === 'function') return this[funcName]();

		// Is there a linked resource available?
		if (this.__links[key] !== undefined) return this.__links[key];

		// Is it a date?
		if (this.constructor.dates !== undefined && _.indexOf(this.constructor.dates, key) !== -1) {
			
			// Convert the value to a moment.
			return moment(this.__attributes[key]);

		}

		// Is it an embedded collection?
		if (this.constructor.embedded !== undefined && this.constructor.embedded[key] !== undefined && 
				!ns.Core.Collection.prototype.isPrototypeOf(this.__attributes[key])) {

			// Convert the items to model instances
			var items = this.__attributes[key],
				ModelClass = ns.Models[this.constructor.embedded[key]],
				collection = new ns.Core.Collection(ModelClass);
			for (var q = 0; q < items.length; q++) {
				var m = new ModelClass();
				m.deserialize(items[q]);
				collection.add(m);
			}

			// Replace.
			this.__attributes[key] = collection;
			
		}


		return this.__attributes[key];
	};


	Model.prototype.set = function(key, value) {
		
		// Dots?
		if (key.indexOf('.') > 0) {

			// Get the object one level up.
			var parts = key.split('.'),
				lastPart = parts.pop(),
				parentKey = parts.join('.'),
				obj = this.get(parentKey);

				console.log('I want to set ', lastPart, ' of ', obj);
			
		} else {

			// A function defined?
			var funcName = 'set' + inflection.camelize(key);
			if (typeof this[funcName] === 'function') return this[funcName](value);

			// Is it a date? Convert back to timestamp
			if (moment.isMoment(value)) {
				value = moment.toIsoString();
			}

			// Same?
			if (value === this.__attributes[key]) return;

			// Set it
			this.__dirty[key] = value;
			this.__attributes[key] = value;

		}


	};



	Model.prototype.each = function(key, callback) {

		// Get the link/prop
		var prop = this.get(key);
		if (ns.Core.Collection.prototype.isPrototypeOf(prop)) {
			prop.each(callback);
		} else {
			_.each(prop, callback);			
		}


	};

	Model.prototype.toArray = function() {

		// Start with attributes
		var result = _.extend(this.__attributes);

		// And the links
		_.each(this.__links, function(data, link) { 
			if ($.isArray(data)) {
				result[link] = _.map(data, function(item) {
					return item.toArray();
				});
			} else if (typeof data === 'object') {
				result[link] = data.toArray();			
			}
		});

		return result;


	};

	Model.prototype.hasLink = function(linkName) {
		return this.__links[linkName] !== undefined;
	};


	Model.prototype.enrich = function(linkName, collection) {

		// Is it part of an embedded model?
		if (linkName.indexOf('.') !== -1) {

			// Split and find the obj
			var parts = linkName.split('.'),
				attr = parts.pop(),
				obj = this;
			while (parts.length > 0 && obj !== undefined) {
				
				// Get the child obj
				var k = parts.shift();
				if (typeof obj.get !== 'function') {
					return false;
				}
				obj = obj.get(k);

				// Is the child object a collection?
				if (ns.Core.Collection.prototype.isPrototypeOf(obj)) {

					// Enrich that collection with the data
					parts.push(attr);
					return obj.enrich(parts.join('.'), collection);
					
				}


			}

			// Use this linkName
			linkName = attr;

		}
		

		// Do we know this link?
		if (this.__links[linkName] === undefined) return false;

		// Is the link a single value?
		if (typeof this.__links[linkName] === 'string' || typeof this.__links[linkName] === 'number') {

			// Replace just the value
			var item = collection.getByPK(this.__links[linkName]);
			if (item) {
				this.__links[linkName] = item;
			}
			return;

		}

		// Loop through my links' values
		this.__links[linkName] = _.map(this.__links[linkName], function(linkItem) {

			// Already an object?
			if (typeof linkItem === 'object') return;

			// Look it up
			var item = collection.getByPK(linkItem);

			// Found something?
			if (item) {

				// Use item
				return item;

			} else {

				// Just use old value
				return linkItem;

			}


		});

		// Anything in there?
		var linkedModel = (this.__links[linkName].length > 0) ? this.__links[linkName][0].constructor : ns.Core.Model;
		
		// Create a collection of it
		var linkedCollection = new ns.Core.Collection(linkedModel);
		for (var q = 0; q < this.__links[linkName].length; q++) {
			linkedCollection.add(this.__links[linkName][q]);
		}
		this.__links[linkName] = linkedCollection;

	};


	Model.prototype.loadLink = function(linkName, apiPath, apiParams) {

		// Create the call
		var promise = ns.promise(),
			model = this;
		ns.api(apiPath, apiParams).then(function(result) {
			
			// Store id's
			model.__links[linkName] = _.keys(result.records.__recordsByPK);
			model.enrich(linkName, result.records);

			// Done!
			promise.resolve();

		});

		return promise;

	};



	Model.prototype.__init = function() {

		this.__primaryKey = 'id';
		this.__attributes = {};
		this.__dirty = {};
		this.__links = {};

	};

	Model.prototype.getPrimary = function() {

		return this.__attributes[this.__primaryKey];

	};

	////////////////////////////////
	// Editing and saving methods //
	////////////////////////////////


	Model.prototype.isNew = function() {

		// Do I have my primary key set?
		return this.__attributes[this.__primaryKey]	=== undefined || this.__attributes[this.__primaryKey] === null;

	};

	Model.prototype.getApiUrl = function() {

		// Anything defined?
		var url = this.constructor.apiUrl;
		if (!url) {

			// Guess by name
			url = '/' + _.underscored(this.constructor.name);
		}

		// Add id?
		if (!this.isNew()) url += '/' + this.__attributes[this.__primaryKey];

		return url;

	};

	Model.prototype.save = function() {

		// Get an array of dirty data
		var self = this;
		var data = _.omit(this.__attributes, this.__primaryKey);

		// Form the url
		var modelUrl = this.getApiUrl(),
			method = this.isNew() ? 'post' : 'put',
			action = this.isNew() ? 'create' : 'update';


		// Make that call.
		var promise = Chick.promise();
		var apiCall = Chick.Net.Api.call(modelUrl, data, {
			method: method
		}).then(function(result) {
			
			// Replace the model with created one.
			self.__attributes = result.records.first().__attributes;

			// Broadcast it broadly.
			Chick.broadcast(self.constructor.name + '.' + action, [self]);
		
			// Good!
			promise.resolve(result);


		}).fail(function(error) {
			
			promise.reject(error);

		});
		return promise;

	};

	Model.prototype.destroy = function() {

		// Form the url
		var modelUrl = this.getApiUrl(),
			self = this;
		return Chick.Net.Api.call(modelUrl, {}, {
			method: 'delete'
		}).then(function() {

			// Broadcast it broadly.
			Chick.broadcast(self.constructor.name + '.destroy', [self]);		

		});

	};


	////////////////////
	// Static methods //
	////////////////////

	Model.create = function(className, startValues) {

		// Find the model class
		var ModelClass = ns.Models[className];
		if (ModelClass === undefined) throw 'Unknown model class ' + className;

		// Instantiate
		var model = new ModelClass();
		if (startValues) model.deserialize(startValues);

		return model;

	};





})(Chick);
'use strict';
(function(ns) {

	function Collection(modelClass) {

		// No model class?
		if (modelClass === undefined) modelClass = ns.Core.Model;
		this.modelClass = modelClass;

		// Create array
		this.__records = [];
		this.__recordsByPK = {};

	}
	ns.register('Core.Collection', Collection);

	Collection.prototype.add = function(record) {

		// Is the record a collection?
		if (Collection.prototype.isPrototypeOf(record)) {

			// Add all records
			var coll = this;
			record.each(function(rec) {
				coll.add(rec);
			});
			return;

		}

		// Add it.
		this.__records.push(record);

		// Get key
		var id = record.getPrimary();
		if (id) this.__recordsByPK[id] = record;

	};

	Collection.prototype.first = function() {
		return this.__records[0] || null;
	};
	Collection.prototype.last = function() {
		return _.last(this.__records);
	};

	Collection.prototype.get = function(index) {
		return this.__records[index] || null;
	};

	Collection.prototype.getByPK = function(key) {
		return this.__recordsByPK[key] || null;
	};

	Collection.prototype.count = function() {
		return this.__records.length;
	};

	Collection.prototype.each = function(callback) {
		for (var i = 0; i < this.__records.length; i++) {
			callback(this.__records[i], i);
		}
	};

	Collection.prototype.map = function(callback) {
		var result = [];	
		for (var i = 0; i < this.__records.length; i++) {
			result.push(callback(this.__records[i], i));
		}
		return result;
	};

	Collection.prototype.list = function(valueAttribute, keyAttribute) {

		var result = [], value;
		for (var i = 0; i < this.__records.length; i++) {
			value = this.__records[i].get(valueAttribute);
			if (keyAttribute === undefined) {
				result.push(value);
			} else {
				result[this.__records[i].get(keyAttribute)] = value;
			}
		}
		return result;

	};

	Collection.prototype.find = function(callback) {

		// Do the underscore find
		return _.find(this.__records, callback);

	};

	Collection.prototype.findBy = function(attribute, value) {

		return _.find(this.__records, function(item) {
			return item.get(attribute) === value;
		});

	};

	Collection.prototype.filter = function(objOrCallback) {

		// Create a new collection
		var result = new Collection(this.modelClass);

		// Loop through items.
		for (var q = 0; q < this.__records.length; q++) {
			
			// Callback or object?
			if (typeof objOrCallback === 'function') {

				// True or false?
				if (objOrCallback(this.__records[q]) === true) result.add(this.__records[q]);

			} else {

				// Check each variable in the obj
				var match = true;
				for (var attr in objOrCallback) {
					var value = this.__records[q].get(attr);
					if (value !== objOrCallback[attr]) {
						match = false;
						break;
					}
				}
				
				// Matched?
				if (match) result.add(this.__records[q]);

			}
		}


		return result;

	};


	Collection.prototype.listUnique = function(valueAttribute) {

		return _.uniq(this.list(valueAttribute));

	};

	Collection.prototype.sortBy = function(callback) {

		this.__records = _.sortBy(this.__records, callback);
		return this;

	};

	Collection.prototype.groupBy = function(iteratee, context) {

		// Attribute given?
		if (typeof iteratee === 'string') {
			var attr = iteratee;
			iteratee = function(model) {
				return model.get(attr);
			};
		}

		return _.groupBy(this.__records, iteratee, context);
	};





	Collection.prototype.toArray = function() {
		return this.__records;
	};



	Collection.prototype.enrich = function(linkName, fromCollection) {

		// Loop through records
		this.each(function(record) { 
			record.enrich(linkName, fromCollection);
		});

	};



	
})(Chick);

'use strict';
(function(ns) {

	function Controller() {
	
	}


	Controller.prototype.setRequest = function(request) {
		this.request = request;
	};


	ns.register('Core.Controller', Controller);

})(Chick);

'use strict';
(function(ns) {

	function Request(url, router) {
	
		// No url?
		if (url === undefined) url = window.location;

		// And router?
		if (router === undefined) router = ns.app.router;

		// Default info
		this.uri = null;
		this.data = {};
		this.method = 'get';
		this.language = false;
		this.anchor = false;
		
		// Make sure it's string, not a Location instance
		if (typeof url !== 'string') url = '' + url;
		this.url = url;

		// Remove protocol and hostname
		url = '/' + url.replace(/^http(s)?\:\/\/[a-zA-Z\.0-9\:\-]+\//, '');

		// Check data
		var queryIndex = url.indexOf('?');
		if (queryIndex !== -1) {

			// Parse the querystring
			var query = url.substr(queryIndex + 1),
				pairs = query.split(/\&/);
			for (var p in pairs) {

				// Split it on =
				var pair = pairs[p].replace(/\+/g, ' ').split(/=/),
					key = decodeURIComponent(pair[0]),
					value = decodeURIComponent(pair[1]);

				// Is the key part of an array?
				var rg = /\[([a-zA-Z0-9]*)\]/g,
					arrayMatch,
					data = this.data;
				while (null !== (arrayMatch = rg.exec(key))) {
					
					// Drop into array
					var arrayKey = arrayMatch[1],
						baseKey = key.substr(0, arrayMatch.index);
					
					if (data[baseKey] === undefined) data[baseKey] = {};
					data = data[baseKey];
					key = arrayKey;


				}
				data[key] = value;
			}


			// Remove from url
			url = url.substr(0, queryIndex);

		}

		// Anchors?
		var anchorParts = url.split(/#/);
		if (anchorParts.length > 1) {
			url = anchorParts[0];
			this.anchor = anchorParts[1];
		}


		// Store full path
		this.fullPath = url;

		// Remove base url
		if (router.baseUrl.length > 0 && url.indexOf(router.baseUrl) === 0) {
			url = url.substr(router.baseUrl.length);
		}



		// Is there a language in the url?
		if (router.languageRegex !== false) {

			// Does it match?
			var langResult = router.languageRegex.exec(url);
			if (langResult) {

				// Use that language
				this.language = langResult[1];

				// Remove from the url.
				url = url.substr(langResult[0].length);

			} else {

				this.language = router.settings.languages[0];

			}

		}


		// Remove trailing slash
		url = url.replace(/\/$/, '');


		

		// Store url
		this.uri = url;
		

	}



	ns.register('Core.Request', Request);

})(Chick);

'use strict';
(function(ns) {

	var instanceCount = 0;

	function Route(pattern, actions, options) {
	
		// Store the pattern
		var self = this;
		this.pattern = pattern;

		// Localize the options
		var settings = ns.extend({
			actions: actions,
			parentRoute: false,
			abstract: false
		}, options);

		this.id = ++instanceCount;
		this.method = settings.method;
		this.parameterRestrictions = {};
		this.hasRestrictions = false;
		this.parentRoute = settings.parentRoute;
		this.subRoutes = [];
	
		// Parse the actions
		this.actions = {};
		_.each(settings.actions, function(action, viewContainerName) {

			// Is it a string? (Controller@action)
			if (typeof action === 'string') {

				// Parse it.
				var result = /^(\w+)@(\w+)$/.exec(action);
				if (!result) {
					throw 'Did not understand action "' + action + '". Use Controller@action format.';
				}

				// Use that
				action = {
					controller: result[1],
					action: result[2]
				};

			} else {

				// Default options
				action = ns.extend({
					action: 'index'
				}, action);

			}

			// No controller?
			if (action.controller === undefined) {
				throw 'A route action needs a controller at the very least. Use \'ControllerName@methodAction\'.';
			}

			self.actions[viewContainerName] = action;

		});

		// No actions
		if (_.size(this.actions) === 0) { 
			throw 'A route needs at least 1 action!';
		}

	}

	ns.register('Core.Route', Route);



	/////////////////////
	// Public function //
	/////////////////////

	Route.prototype.match = function(request) {

		// Am I abstract?
		if (this.abstract) {

			// An abstract route can never be matched directly, only its subroutes
			return false;

		}
		// Method first
		if (typeof request === 'string') {
			request = new ns.Core.Request(request);
		}
		if (request.method !== this.method) return false;

		// Have I been regexified?
		if (this.regex === undefined) this.__createRegEx();

		// Match?
		if (this.regex.test(request.uri) === false) return false;
		
		// Any restrictions?
		if (this.hasRestrictions === false) return true;

		// Get params
		var match = this.regex.exec(request.uri),
			params = match.slice(1, 1 + this.parameters.length);

		// Check if they match
		for (var p in this.parameters) {
			var regexes = this.parameterRestrictions[this.parameters[p]];
			if (regexes === undefined) continue;
			for (var r in regexes) {
				if (regexes[r].test(params[p]) === false) return false;
			}
		}
				
		return true;	

	};

	
	Route.prototype.getActions = function() {

		// No parents?
		if (this.parentRoute === false) return this.actions;

		// Merge with my parent.
		return _.extend(this.parentRoute.getActions(), this.actions);

	};

	Route.prototype.getActionQueue = function(params) {

		// Get an array of parents, and me last
		var r = this, routes = [];
		while (r !== false) {
			routes.unshift(r);
			r = r.parentRoute;
		}

		// Loop down from parents to me and add the actions
		var queue = {};
		for (var q = 0; q < routes.length; q++) {

			// Loop through the actions
			r = routes[q];
			_.each(r.actions, function(action, key) {
				
				// Check which of the params are applicable for this route.
				var myParams = params.slice(0, r.parameters.length);

				// Set action in queue
				queue[key] = {
					route: r,
					routeParams: myParams,
					key: key,
					action: action
				};

			});

		}

		return queue;

	};


	Route.prototype.execute = function(request) {
		
		var self = this;

		// Method first
		if (typeof request === 'string') {
			request = new ns.Core.Request(request);
		}
		if (request.method !== this.method) return false;


		// Get params
		var match = this.regex.exec(request.uri),
			params = match.slice(1, 1 + this.parameters.length);

		// Combine into single promise
		var promise = Chick.promise();

		// Now create a queue with actions
		var ctrlNs = ns.app.router.controllerNamespace;
		ctrlNs = ctrlNs ? ctrlNs + '.' : '';

		var combinedResult = {},
			actionQueue = this.getActionQueue(params),
			queue = _.keys(actionQueue);

		// Process each in order.
		var processNext = function() {

			// Done?
			if (queue.length === 0) {

				// Finished!
				promise.resolve(combinedResult);
				return;

			}

			// Get first
			var targetView = queue.shift(),
				info = actionQueue[targetView],
				action = info.action;

			//////////////////////////////////////////////////////////////////////////////////////////////////////
			// Is this action necessary, or is the current content still the content for the active parentRoute //
			//////////////////////////////////////////////////////////////////////////////////////////////////////
			// This only applies for parent routes, because we want to make sure that a refresh works, by opening
			// the same url again.

			var viewContainer = ns.app.getViewContainer(info.key);
			if (queue.length !== 0 && viewContainer.isLastSetBy(info.route, info.routeParams)) {

				// Move on, this viewcontainer's content does not need to change.
				processNext();
				return;

			}
			
			// Find the controller class
			var ctrl = ctrlNs + action.controller,
				ControllerClass = Chick.arrayGet(Chick, ctrl, null);
			if (!ControllerClass) throw 'There is no controller defined as ' + ctrl;
			
			// Create the controller
			var controller = new ControllerClass();
			controller.setRequest(request);
			if (controller[action.action] === undefined) throw 'The controller does not have a method ' + action.action;

			// Get the result and process it/
			var response = controller[action.action].apply(controller, info.routeParams);			
			self.__processResponse(targetView, response).then(function(result) {

				// Store the result
				combinedResult[targetView] = response;

				// Trigger a actionComplete event on the router
				ns.app.router.trigger('actionComplete', [targetView, result, this]);

				///////////////////////////////////////////////////////
				// Set the content in the appropriate view container //
				///////////////////////////////////////////////////////
				viewContainer.setContent(result, info.route, info.routeParams);
				
				// And onward.
				processNext();

			});


		};
		processNext();

		// Done.
		return promise;


	};

	Route.prototype.leave = function(newRequest) {

		// Did we have a view?
		if (this.view) {

			// Wait for the outro to complete?
			return this.view.leave(newRequest);			

		}

		return true;


	};

	Route.prototype.having = function(parameter, regex) {

		// Store it
		if (this.parameterRestrictions[parameter] === undefined) this.parameterRestrictions[parameter] = [];
		this.parameterRestrictions[parameter].push(regex);
		this.hasRestrictions = true;
		return this;


	};


	Route.prototype.sub = function(callback) {

		// Create some local functions
		var self = this;
		var obj = {
			get: function(pattern, actions, options) {
				if (options === undefined) options = {};
				options.parentRoute = self;
				return ns.app.router.get(pattern, actions, options);
			},
			post: function(pattern, actions, options) {
				if (options === undefined) options = {};
				options.parentRoute = self;
				return ns.app.router.post(pattern, actions, options);
			}
		};

		callback.apply(obj);

	};




	///////////////////////
	// Private functions //
	///////////////////////

	Route.prototype.__processResponse = function(targetName, response, promise) {

		// Create a promise
		if (promise === undefined) promise = ns.promise();

		// False?
		if (response === false) {

			// 404!
			promise.reject(404);

		// Did we receive a view?
		} else if (ns.knows('Gui.View') && ns.Gui.View.prototype.isPrototypeOf(response)) {

			// Render the view then.
			this.view = response;
			this.view.render().then(function(result) {
				promise.resolve(result);
			});


		// Or was it a redirect?
		} else if (ns.Core.Redirect.prototype.isPrototypeOf(response)) {
				
			// Go there.
			ns.app.router.open(response.url);

			
		// Or did we receive a promise?
		} else if (typeof response === 'object' && typeof response.then === 'function'){ 

			// Wait for it to finish and then process it again
			var route = this;
			response.then(function(result) {
				route.__processResponse(targetName, result, promise);
			});
			

		} else {

			// Resovle the promise with the data itself
			promise.resolve(response);

		}

		return promise;

	};

	Route.prototype.__getPattern = function() {

		// Start with my own pattern
		var p = this.pattern;

		// Prepend any parent patterns
		var parentRoute = this.parentRoute;
		while (parentRoute !== false) {

			// Add it.
			p = parentRoute.pattern +  p;

			// Deeper.
			parentRoute = parentRoute.parentRoute;

		}

		// Done.
		return p;

	};

	Route.prototype.__createRegEx = function() {

		// Convert variables in pattern
		var params = [],
		p = this.__getPattern()

			// ":name" will match any word or multiple words
			.replace(/\/:([a-zA-Z]+)/g, function(all, param) {
				params.push(param);
				return '/([-a-zA-Z0-9,\.]+)';
			})

			// as will "{name}"
			.replace(/\/{([a-zA-Z]+)}/g, function(all, param) {
				params.push(param);
				return '/([-a-zA-Z0-9,\.]+)';
			})

			// "{#name}" will match any single number
			.replace(/\/{\#([a-zA-Z]+)}/g, function(all, param) {
				params.push(param);
				return '/([0-9]+)';
			})

			// "{*name" will match any string, including forward-slashes
			.replace(/\/{\*([a-zA-Z]+)}/g, function(all, param) {
				params.push(param);
				return '/(.+)';
			});



		// Remove trailing slash and escape 'em
		p = p.replace(/\/$/, '');
		p = p.replace(/\//g, '\\\/');
		
		// Create regex version of the pattern
		this.regex = new RegExp('^' + p + '$');
		this.parameters = params;
		
	};





})(Chick);

'use strict';
(function(ns) {

	function Router(options) {
	
		// Register my events
		this.__registerEvents(['navigationStart', 'navigationComplete', 'error', 'pageNotFound', 'selectLanguage', 'actionComplete']);

		// The default options
		this.settings = ns.extend({

			baseUrl: '/',
			catchLinks: true,
			catchForms: false,
			controllerNamespace: null
			
		}, options);

		// Localize some settings
		this.baseUrl = this.settings.baseUrl.replace(/\/$/, '');
		this.languageRegex = false;
		this.controllerNamespace = this.settings.controllerNamespace;

		// Main variables
		this.routes = [];
		this.activeRoute = null;

		// Register history listener
		var router = this;
		History.Adapter.bind(window, 'statechange', function() {
			
			var state = History.getState();

			// Goto that url
			router.goto(state.cleanUrl);

		});

		// Register content enabler
		if (this.settings.catchLinks) {
		
			ns.registerContentProcessor(function($target) {

				// Navigate
				var $btns = $target.find('a').not('[href^="http"]').not('[href^="#"]').not('[href^="//"]');
				$btns.on('click', function(e) {
					e.preventDefault();
					History.pushState(null, null, $(this).attr('href'));
				});
			});

		}

		if (this.settings.catchForms) {

			ns.registerContentProcessor(function($target) {

				// Form submission
				$target.find('form').not('[action^="http"]').on('submit', function(e) {

					// Convert form data to a querystring
					var $form = $(this);
					e.preventDefault();
					
					// Now listen to formSubmit again
					var listener = function(e) {

						// Open the url
						History.pushState(null, null, $form.attr('action') + '?' + $form.serialize());						

					};
					$form.on('formSubmit', listener);

					// Trigger form submit event to allow other handlers to cancel it
					$form.trigger('formSubmit');

					// Remove listener
					$form.off('formSubmit', listener);

					


					
				});

			});

		}
	}	
	ns.register('Core.Router', ns.Core.TriggerClass, Router);



	//////////////////////
	// Public functions //
	//////////////////////

	Router.prototype.get = function(pattern, actions, options) {
		if (options === undefined) options = {};
		options.method = 'get';
		return this.add(pattern, actions, options);
	};

	Router.prototype.post = function(pattern, actions, options) {
		if (options === undefined) options = {};
		options.method = 'post';
		return this.add(pattern, actions, options);
	};


	Router.prototype.detectLanguage = function() {

		// Try to find the language with current locatioN
		var request = new ns.Core.Request(); 
		return request.language;

	};



	Router.prototype.languages = function(allowLanguages) {
		
		// Store
		this.settings.languages = allowLanguages;

		// None?
		if (allowLanguages === false) {
			this.languageRegex = false;		
		} else {

			// Create a regular expression to detect language from url
			this.languageRegex = new RegExp('\/(' + allowLanguages.join('|') + ')');

		}

		return this;

	};


	Router.prototype.add = function(pattern, actions, options) {

		// Create the route
		var route = new ns.Core.Route(pattern, actions, options);
		
		// Add to main routes
		this.routes.push(route);			
		
		// Is it a subRoute?
		if (route.parentRoute !== false) {
			route.parentRoute.subRoutes.push(route);
		}

		return route;

	};

	Router.prototype.open = function(url) {
		History.pushState(null, null, url);
		return this;
	};


	Router.prototype.redirect = function(url) {

		// Remove current state from history and go to new url
		History.replaceState(null, null, url);
		return this;

	};
 

	Router.prototype.switchLanguage = function(language) {

		// Gather current url and replace language
		var req = this.lastRequest,
		url = req.url.replace('/' + req.language + '/', '/' + language + '/');
		if (req.uri === '') {
			url = '/' + language;
		}
		return this.goto(url);

	};


	Router.prototype.goto = function(url) {

		// Clean the url
		var request = ns.Core.Request.prototype.isPrototypeOf(url) ? url : new ns.Core.Request(url),
			self = this;
		this.lastRequest = request;

		// Different language?
		if (request.language !== false && request.language !== ns.app.language) {

			// Refresh?
			if (this.settings.refreshOnLanguageSwitch) {

				// Do a window locatioN
				window.location = request.url;
				return;

			} else {

				// Change.
				this.trigger('selectLanguage', request.language);

			}

		}

		// Setup delayed action
		var delayedAction = ns.promise();

		// Leaving route
		if (this.activeRoute) {

			// Ask to leave the route
			var leaveResult = this.activeRoute.leave(request);

			// Failed?
			if (leaveResult === false) {
				return;
			} else if (ns.isPromise(leaveResult)) {

				// Wait for this.
				leaveResult.then(function() {
					delayedAction.resolve();
				});

			} else {

				// We continue at once.
				delayedAction.resolve();

			}

		} else {

			// We continue at once.
			delayedAction.resolve();

		}

		// When event handling has completed
		delayedAction.then(function() {

			// Start loading
			self.trigger('pageLoadStart', request.uri, request);
			
			// Find the matching route
			var route = false;
			for (var q in self.routes) {
				if (self.routes[q].match(request)) {

					route = self.routes[q];
					break;

				}
			}

			// Found anything?
			if (route === false) {

				// Throw the error
				self.trigger('error', 404);
				self.trigger('pageNotFound');

			} else {

				// Store route
				self.activeRoute = route;

				// Execute the route
				route.execute(request).then(function(result) {

					// Done.
					self.trigger('navigationComplete', result);

				}).fail(function(result) {
					self.trigger('error', result);
				});


			}


		});

	};


	Router.prototype.start = function() {

		// Goto initial url
		var state = History.getState();
		return this.goto(state.cleanUrl);
	};


	///////////////////////
	// Private functions //
	///////////////////////

	





})(Chick);

'use strict';
(function(ns) {

	function Redirect(url) {
		this.url = url;
	}


	ns.register('Core.Redirect', Redirect);


})(Chick);

'use strict';

var ns = Chick.register('Net.Api', {

	config: {

		baseUrl: '/api/v1',
		key: '',
		urlSuffix: ''

	},


	/**
	 * Configure the Chick API connector
	 *
	 * Options for the configuration are:
	 *
	 * 	baseUrl		{string}		The prefix for each api url (default = /api/v1)
	 * 
	 * @param  {array} options  Associative array with 
	 * @return {array} The now active configuration
	 */	
	configure: function(options) {

		return _.extend(this.config, options);

	},

	call: function(path, params, ajaxOptions, options) {

		// Create the api call
		return new Chick.Net.ApiCall(path, params, ajaxOptions, options);

	},

	createUrl: function(path) {

		var url = this.config.baseUrl + path + this.config.urlSuffix;
		return url;

	},


	cache: function(key, value, expires) {

		// Value?
		if (value !== undefined) {

			// Add expiry date
			if (expires === undefined) {
				expires = moment().add(24, 'hours');
			} else if (typeof expires === 'number') {
				expires = moment().add(expires, 'seconds');
			}
			value = expires.format() + value;			

			// Store it
			localStorage['Chick-api-cache.' + key] = value;

		} else {

			// Get value
			value = localStorage['Chick-api-cache.' + key];
			if (!value) return;

			// Get the expiry
			var now = moment(),
				then = moment(value.substr(0, moment().format().length));
			if (then.isValid() === false) return;

			// Compare dates
			if (now.unix() > then.unix()) return;

			// Value is still valid.
			return value.substr(moment().format().length);

		}

	}




});

// Register generic api function shortcut
Chick.api = function() {
	return ns.call.apply(ns, arguments);
};


'use strict';
(function(ns) {

	function ApiCall(path, params, ajaxOptions, options) {

		// Check parameters
		var data = null;
		if (typeof params === 'string') {
			path += '/' + path;
		} else if (typeof params === 'object') {

			// Include?
			if (params.include !== undefined && typeof params.include !== 'string'){
				params.include = params.include.join(',');
			}


			// Use it.
			data = params;
		}

		// Create url
		var url = ns.Net.Api.createUrl(path);

		// Check options
		ajaxOptions = _.extend({
			type: 'get',			
			data: data || {},
			url: url,
			headers: {
				'X-Api-Key': ns.Net.Api.config.key
			}
		}, ajaxOptions || {});
		
		options = _.extend({
			allowCache: false,
			cacheExpire: undefined,
			model: false,
			handleErrors: true
		}, options || {});

		

		// Create a cache-key to lookup
		var apiCall = this;
		if (options.allowCache === true	) {

			var cacheKey = ajaxOptions.type.toUpperCase() + ' ' + url + '?' + $.param(ajaxOptions.data),
				cachedResult = ns.Net.Api.cache(cacheKey);

			// Found?
			if (cachedResult !== undefined) {

				// Use this!
				var apiResult = new ns.Net.ApiResult($.parseJSON(cachedResult), path, { model: options.model });
				apiCall.resolve(apiResult, cachedResult);
				return;

			}

		}

		// Do we have CORS support?
		if ($.support.cors === false) {

			// Use JSONP protocol instead
			ajaxOptions.dataType = 'jsonp';
			ajaxOptions.data.alt = 'jsonp';
			ajaxOptions.data.api_key = ns.Net.Api.config.key;
			
		}
		
		//console.log('[API] ' + options.type.toUpperCase() + ' ' + url);

		// Make the ajax call
		this.ajaxCall = $.ajax(ajaxOptions).done(function(result, textStatus, xhr) {

			// Parse the result
			var apiResult = new ns.Net.ApiResult(result, path, { model: options.model });
			apiCall.resolve(apiResult, xhr.responseText);

			// Cache it?
			if (options.allowCache === true) {

				// Remember this result!
				ns.Net.Api.cache(cacheKey, xhr.responseText, options.cacheExpire);

			}

		}).fail(function(error) {

			apiCall.reject(error);
			if (options.handleErrors !== false)	ApiCall.any.trigger('error', error);			
			
		});


	}

	ns.register('Net.ApiCall', ns.Core.Promise, ApiCall);

	ApiCall.prototype.abort = function() {

		this.ajaxCall.abort();
		return this;

	};




	ApiCall.any = new ns.Core.TriggerClass();
	ApiCall.any.__registerEvents(['error']);







})(Chick);
'use strict';
(function(ns) {

	function ApiResult(data, apiPath, options) {

		// Localize meta data
		this.meta = data.meta;
		delete data.meta;

		// Get linked data
		if (data.linked !== undefined) {
			this.linked = this.__deserializeLinked(data.linked);
			delete data.linked;
		}

		// Get link information
		this.linkInfo = false;
		if (data.links !== undefined) {
			this.linkInfo = data.links;
			delete data.links;
		}

		// Check class
		var settings = _.extend({
			model: false
		}, options);

		// Only 1 key should be left
		this.rootElement = _.first(_.keys(data));
		
		// Try to deserialize
		this.records = this.__deserialize(
			data[this.rootElement], 
			settings.model ? settings.model : inflection.classify(this.rootElement)
		);

		// Now loop through the links to see if enrichment is in order.
		if (this.linkInfo) {
			this.__enrichLinks();
		}

	}
	ns.register('Net.ApiResult', ApiResult);


	ApiResult.prototype.each = function(callback) {
		return this.records.each(callback);
	};


	ApiResult.prototype.__deserialize = function(data, modelName) {

		// Find model
		var ModelClass = typeof ns.Models[modelName] === 'function' ? ns.Models[modelName] : ns.Core.Model;

		// Loop data
		var collection = new ns.Core.Collection(ModelClass);
		_.each(data, function(item) {

			// Deserialize
			var record = new ModelClass();
			record.deserialize(item);

			// Add it.
			collection.add(record);

		});

		// We have the collection
		return collection;

	};

	ApiResult.prototype.__deserializeLinked = function(data) {

		// Loop through it
		var result = {}, apiResult = this;
		_.each(data, function(records, key) {
			result[key] = apiResult.__deserialize(records, inflection.classify(key));
		});
		return result;


	};

	ApiResult.prototype.__enrichLinks = function() {

		// Loop through it
		for (var relation in this.linkInfo) {
			
			// Is this type embedded?
			var info = this.linkInfo[relation];

			if (info.type === undefined) continue;
			if (this.linked[info.type] === undefined) continue;


			// Split in model.fieldname (e.g. lines.journeys)
			var parts = relation.split('.'),
				collectionName = parts[0],
				foo = parts.shift(),
				attrPath = parts.join('.');
			
			// Is it for the main result?
			if (collectionName === this.rootElement) {
				this.records.enrich(attrPath, this.linked[info.type]);
			}
			
			// Is it part of another linked resource?
			if (this.linked[collectionName] !== undefined) {
			
				// Enrich that.
				this.linked[collectionName].enrich(attrPath, this.linked[info.type]);

			}

		}

	};



})(Chick);
'use strict';
(function(ns) {

	function Directive($el, options) {

	}
	ns.register('Gui.Directive', Directive);



	////////////////////
	// Static methods //
	////////////////////

	Directive.enableDirectives = function($el, data, view) {
			
		// Store created directives
		var createdDirectives = {},
			creationCounts = {};

		// Find tags
		var tags = _.keys(Chick.directiveClasses),
			query = tags.join(':not([data-directive]),') + ':not([data-directive])',
			$elements = $el.find(query);
		for (var q = $elements.length - 1; q >= 0; q--) {

			// Get all attributes into options
			var dir = $elements.get(q),
				options = {},
				broadcastListeners = {};
			_.each(dir.attributes, function(attr) {
				
				// Is it a broadcast-listener?
				if (/\-on$/.test(attr.name)) {

					// Get method, and the events to listen to
					var method = attr.name.substr(0, attr.name.length-3),
						events = attr.value.split(/\s*,\s*/);
					_.each(events, function(eventName) {
						if (broadcastListeners[eventName] === undefined) broadcastListeners[eventName] = [];
						broadcastListeners[eventName].push(method);
					});

				}

				// Check if name is a 'chick-' special (needs to be eval'ed)
				var value;
				if (/^chick\-/.test(attr.name)) {

					// Evaluate the attribute's value
					var name = _.camelize(attr.name.substr(6)),
						func = function() {
							return eval(attr.value);
						};
					value = func.call(data);

					// Store!
					options[name] = value;

				} else {

					// Convert value into proper type
					value = attr.value;
					if (value === '' || value === 'true') {
						value = true;
					} else if (value === 'false') {
						value = false;
					} else {
						try {
							value = JSON.parse(value);
						} catch(e) {}
					}
					options[_.camelize(attr.name)] = value;

				}
			});

			
			// Create an instance
			var $directive = $(dir),
				DirectiveClass = Chick.directiveClasses[dir.tagName.toLowerCase()],
				directive = new DirectiveClass($directive, options);

			// Set some basic values
			directive.$element = $directive;
			directive.settings = _.extend({}, DirectiveClass.defaultSettings, options);


			// And..... construct!
			if (directive.__construct() !== false) {
			
				// Store it globally
				Chick.createdDirectives.push(directive);
				$directive.attr('data-directive', Chick.createdDirectives.length - 1);

				// Do we have a name/id for it?
				var name;
				if (options.id) {
					name = options.id;
				} else {

					// Count the number of instantiated directives
					var dirName = _.camelize(dir.tagName.toLowerCase());
					if (creationCounts[dirName] === undefined) creationCounts[dirName] = 0;

					// Use that as a name
					name = dirName + creationCounts[dirName];

					// Count on.
					creationCounts[dirName]++;

				}

				// Remember it
				createdDirectives[name] = directive;

				// Apply global event listeners
				_.each(broadcastListeners, function(methods, eventName) {
					Chick.listen(eventName, function(args) {
						_.each(methods, function(method) {
							directive[method].apply(directive, args);
						});
					});					
				});


			} 
		
		}

		// Done.
		return createdDirectives;

	};


	////////////////////
	// Public methods //
	////////////////////

	Directive.prototype.getElement = function() {

		// This is set when the tag is recognised and the class is instantiated
		return this.$element;

	};

	Directive.prototype.findChildDirectives = function(type, onlyImmediateChildren) {

		// Type defined?
		var query = '[data-directive]';
		if (type !== undefined) query = type + query;
		if (onlyImmediateChildren === true) query = '>' + query;

		// Find elements
		var children = [];
		this.$element.find(query).each(function(index, child) {

			// Get directive instance
			children.push(Chick.getDirectiveInstance($(child).attr('data-directive')));

		});

		
		return children;

	};



	Directive.prototype.findTemplate = function(tag, mandatory, removeTag) {

		// Find the tag and make it into an underscore template
		var $el = this.$element.find('>' + tag),
			template = $el.html();
		template = _.replaceAll(template, '<#', '<%');
		template = _.replaceAll(template, '&lt;#', '<%');
		template = _.replaceAll(template, '#>', '%>');
		template = _.replaceAll(template, '#&gt;', '%>');

		// Anyting?
		if (template.length === 0) {
			if (mandatory === true) throw 'The ' + this.$element[0].tagName.toLowerCase() + ' directive needs a <' + tag + '> tag containing an underscore-template, using <# and #>.';
			return false;
		}

		// Remove this tag?
		if (removeTag !== false) {
			$el.remove();
		}

		// Create the template
		return new Chick.Gui.Template(template);

	};





})(Chick);

'use strict';
(function(ns) {

	var I18n = ns.register('Gui.I18n');

	I18n.language = $('html').attr('lang') || 'en';
	I18n.baseUrl = 'lang/:lang/';

	I18n.data = {};

	I18n.numbers = {
		decimal: '.',
		thousands: ',',
		thousandsLength: 3,
		currency: {
			precision: 2
		}
	};



	I18n.setBaseUrl = function(url) {
		if (!/\/$/.test(url)) url = url + '/';
		I18n.baseUrl = url;
	};
	I18n.setLanguage = function(lang) {
		I18n.language = lang;

		// Apply to moment as well
		moment.locale(lang);

	};

	I18n.currencyFormat = function(number) {
		return I18n.numberFormat(number, I18n.numbers.currency.precision);
	};
	I18n.numberFormat = function(number, precision) {
		
		// The decimal part
		var nr = number.toFixed(precision);
		
		// Now look for thousands
		var parts = nr.split('.');
		if (parts[0].length > I18n.numbers.thousandsLength) {
			var rgx = /(\d+)(\d{3})/,
				whole = parts[0];
			while (rgx.test(whole)) {
				whole = whole.replace(rgx, '$1' + I18n.numbers.thousands + '$2');				
			}
			nr = whole + I18n.numbers.decimal + parts[1];
		} else {
			nr = nr.replace('.', I18n.numbers.decimal);
		}

		return nr;
	};



	I18n.switchLanguage = function(lang) {
		I18n.language = lang;
		I18n.apply();
	};

	I18n.apply = function($target) {

		// Find elements
		if ($target === undefined) $target = $('html');
		$target.find('[data-i18n]').each(function(el) {
			var $el = $(this),
				parts = $el.data('i18n').split(',');
			for (var i in parts) {

				// Split on :
				var attrAndValue = parts[i].split(':');
				if (attrAndValue.length === 1) {
					$el.text(I18n.get(attrAndValue[0]));
				} else {
					$el.attr(attrAndValue[0], attrAndValue[1]);
				}

			}

		});



	};

	I18n.replaceLocations = function(str) {

		// Get my locations
		var locs = I18n.get('locations.abbreviations');
		for (var key in locs) {
			var regex = new RegExp(key, 'gi');
			str = str.replace(regex, locs[key]);
		}
		return str;


	};

	I18n.load = function(bundleName, language, prefix) {

		// Form url
		if (language === undefined) language = I18n.language;
		var url = I18n.baseUrl.replace(':lang', language) + bundleName + '.json';

		// Apply to moment too
		moment.locale(language);
		
		// Get it.
		var promise = ns.promise();
		$.ajax({
			url: url
		}).then(function(result) {
			
			// Store the data
			var obj = I18n.data;
			if (prefix !== undefined) {
				obj = obj[prefix];
			}
			obj = ns.extend(obj, result);


			// Check number format
			if (obj.numbers !== undefined) {
				I18n.numbers = ns.extend(I18n.numbers, obj.numbers);
			}

			// Done.
			promise.resolve(result);

		});


		return promise;

	};

	I18n.get = function(key, variables) {
		var translation = ns.arrayGet(I18n.data, key, false);
		if (translation) {

			// Check variables
			if (variables !== undefined) {

				// Only 1 variable?
				if (typeof variables === 'string') {

					// Find the first variable match and replace it
					translation = translation.replace(/\:[a-zA-Z]+/, variables);
					
				} else if (typeof variables === 'object') {

					// Do a replace for each var
					_.each(variables, function(value, key) {
						translation = translation.replace(':' + key, value);
					});

				}

			}

			return translation;
		} else {
			return '[' + key + ']';
		}
	};




	
	// Register the global function
	window.trans = I18n.get;
	window.I18n = I18n;



})(Chick);

'use strict';
(function(ns) {

	function Template(source, options) {

		// Create handlebars
		this.__compiled = _.template(source, options);

	}
	ns.register('Gui.Template', Template);


	Template.prototype.run = function(data) {
		var result = this.__compiled(data);
		_.each(Template.hooks, function(cb) {
			result = cb(result, data);
		});
		return result;
	};

	Template.prototype.use = function(data, $target) {

		$target.html(this.run(data));

		return $target;

	};

	Template.hooks = [];

	Template.hook = function(cb) {
		Template.hooks.push(cb);
		return Template;
	};



	// Global
	ns.template = function(source, data, $target) {
		var templ = new Template(source);
		if ($target === undefined) {
			return templ.run(data);
		} else {
			return templ.use(data, $target);
		}

	};

})(Chick);

'use strict';
(function(ns) {

	function View(source, method, requestData) {
	
		this.method = method === undefined ? 'get' : method;
		this.requestData = requestData === undefined ? {} : requestData;
		this.source = source;
		
		this.data = {}; 

		this.forms = {};

		this.template = null;
		this.__loadPromise = undefined;
		this.__waitFor = [];
		this.__waitForLeaveAnimation = false;
		
		this.__registerEvents(['ready', 'leave', 'render']);

	}
	ns.register('Gui.View', ns.Core.TriggerClass, View);
	


	View.prototype.preloadImage = function(url) {

		// Create loader
		var promise = ns.promise();
		$('<img/>')
			.on('load', function(){
				promise.resolve();
			})
			.on('error', function() {
				promise.resolve();
				throw 'Could not find image: ' + url;
			})
			.attr('src', url);
		
		// Add to waits
		this.__waitFor.push(promise);
		return this;

	};

	View.prototype.preloadImages = function(urls) {

		// Loop
		for (var i in urls) {
			this.preloadImage(urls[i]);
		}
		return this;

	};

	View.prototype.withJson = function(keyOrUrl, urlOrNull) {

		// Was a key given?
		var url = keyOrUrl,
			key = false;
		if (urlOrNull !== undefined) {
			url = urlOrNull;
			key = keyOrUrl;
		}

		// Get the URL
		var promise = ns.promise(),
			view = this;
		$.ajax({
			url: url
		}).then(function(result) {

			// Store it.
			if (key) {
				view.data[key] = result;
			} else {
				view.data = result;
			}
			promise.resolve();

		});

		// Add promise and be done.
		this.__waitFor.push(promise);
		return this;

	};



	View.prototype.withData = function(dataOrKey, dataOrNull, customResolver) {

		// Was a key given?
		var data = dataOrKey,
			key = false;
		if (dataOrNull !== undefined) {
			data = dataOrNull;
			key = dataOrKey;
		}

		// Is the data a promise?
		var promise = ns.promise();

		if (typeof data === 'object' && typeof data.then === 'function') {

			// Wait for it.
			data.then(function(result) {
				if (customResolver) {
					customResolver(promise, result);
				} else {
					promise.resolve(result);
				}
			});

			// Add this promise to the wait-for
			this.__waitFor.push(promise);

		} else {

			// Resolve it now.
			promise.resolve(data);

		}

		// When it's done in any case.
		var view = this;
		promise.then(function(info) {
			if (key) {
				view.data[key] = info;
			} else {
				view.data = info;
			}
		});

		return this;
	};


	View.prototype.withCollection = function(key, apiCallOrCollection, processCallback) {

		// Add as data with a custom resolver to return the collection instead of APIResult
		var view = this;
		return this.withData(key, apiCallOrCollection, function(promise, data) {

			// Process
			var records = data.records;
			if (processCallback !== undefined) {
			
				// Run the callback
				var result = processCallback.apply(view, [records]);

				// A false!?
				if (result === false) {

					// 404.
					ns.app.abort(404);
					return;

				}

				// Result given? Then replace it
				if (result !== undefined) records = result;
			}

			// Return the collection
			promise.resolve(records);

		});

	};
	View.prototype.withModel = function(key, apiCallOrModel, processCallback) {

		// Is the data just a simple hash-object?
		if (typeof apiCallOrModel === 'object' && !Chick.Core.Model.prototype.isPrototypeOf(apiCallOrModel) && !Chick.Net.ApiCall.prototype.isPrototypeOf(apiCallOrModel)) {

			// Convert it into a model
			var model = new Chick.Core.Model();
			model.deserialize(apiCallOrModel);
			apiCallOrModel = model;

		}

		// Add as data with a custom resolver to return the collection instead of APIResult
		return this.withData(key, apiCallOrModel, function(promise, data) {

			// Is there a first record?
			var model = data.records.first();
			if (!model) {

				// Failed.
				ns.app.abort(404);

			} else {

				// Process
				if (processCallback !== undefined) {
					var result = processCallback(model);
					if (result !== undefined) model = result;
				}

				// Return the collection
				promise.resolve(model);

			}

		});

	};


	View.prototype.onSubmit = function(name, submitCallback) {

		// Store it.
		this.forms[name] = {
			name: name,
			submitCallback: submitCallback
		};

		return this;

	};





	View.prototype.load = function() {

		// One promise to handle loading of the view
		if (this.__loadPromise !== undefined) return this.__loadPromise;
		this.__loadPromise = ns.promise();
		this.__waitFor.push(this.__loadPromise);

		// Load the file
		var view = this;
		$.ajax({
			url: View.path + this.source + View.defaultSuffix,
			data: this.requestData,
			method: this.method
		}).then(function(result) {
	
			// Create the tempalte
			view.template = new ns.Gui.Template(result);
			
			// Done.
			view.__loadPromise.resolve();

		}).fail(function(result) {

		});


		return this.__loadPromise;

	};


	View.prototype.render = function() {

		// Render
		this.trigger('render');
		View.any.trigger('render', this);

		// Create a promise
		var promise = ns.promise();

		// Load the template.
		this.load();

		// When loading is done. (and also any DATA calls)
		var view = this;
		ns.when(this.__waitFor).then(function() {

			// Now run the template into my element
			view.$element = $(view.template.run(view.data));

			// Enable the content
			ns.enableContent(view.$element);

			// Enable the directives
			view.directives = Chick.Gui.Directive.enableDirectives(
				view.$element,
				view.data,
				view
			);

			// Check for forms
			_.each(view.forms, function(info, name) {

				// Find the form
				view.$element.find('form[name=' + name + ']').on('submit', function(e) {
					e.preventDefault();

					// Call it, with the view as context
					info.submitCallback.apply(view, [$(this), e]);

				});

			});

			// Now run it with my data
			promise.resolve(view.$element);
			
			// Ready callbacks
			view.trigger('ready');
			View.any.trigger('ready', view);

		});

		return promise;

	};

	View.prototype.waitForLeaveAnimation = function(waitForLeaveAnimation) {
		this.__waitForLeaveAnimation = (waitForLeaveAnimation === undefined) ? true : waitForLeaveAnimation;
		return this;
	};


	View.prototype.leave = function(newRequest) {

		// Trigger the leave event and listen to what those listeners return
		var triggerResults = this.triggerAndReturn('leave', newRequest);
		View.any.trigger('leave', this, newRequest);
		if (triggerResults.length > 0) {

			// Check results
			var promises = [];
			for (var i = 0; i < triggerResults.length; i++) {

				// False?
				if (triggerResults[i] === false) {

					// Then we are not leaving
					return false;

				}

				// A promise?
				if (ns.isPromise(triggerResults[i])) {

					// Add to promises
					promises.push(triggerResults[i]);

				}

			}

			// Any promises made?
			if (promises.length > 0) {

				// Wait for them 
				if (promises.length === 1) return promises[0];
				var promise = ns.promise();
				return ns.when(promises);

			}

		}
		
		// All is good, just leave.
		return true;

	};





	// Static instantiator
	View.make = function(source, method, data) {

		// Create it
		var view = new View(source, method, data);

		return view;

	};

	// Global events.
	View.any = new Chick.Core.TriggerClass();
	View.any.__registerEvents(['ready', 'leave', 'render']);

	// Static path setter
	View.path = 'views/';
	View.defaultSuffix = '.jt';



})(Chick);

'use strict';
(function(ns) {

	function ViewContainer(name, $target) {
	
		// Localize
		var self = this;
		this.name = name;
		this.$target = $target;

		this.lastSetByRoute = false;
		this.lastSetByRouteParams = false;

		// Store me on the view container
		this.$target.data('viewcontainer', this);

	}
	ns.register('Gui.ViewContainer', ns.Core.TriggerClass, ViewContainer);
	


	ViewContainer.prototype.setTarget = function($el) {

		// Is the element the same?
		if ($el[0] === this.$target[0]) return;

		// Set it
		this.$target = $el;

		// That means we can assume that this will have to be reset by another route.
		this.lastSetByRoute = false;
		this.lastSetByRouteParams = false;

	};

	ViewContainer.prototype.setContent = function(html, byRoute, byRouteParams) {

		// Store last route (this is to check whether the viewcontainer needs a refresh is a sub-page is loaded)
		this.lastSetByRoute = byRoute ? byRoute : false;
		this.lastSetByRouteParams = byRouteParams;

		// Set it.
		this.$target.html(html);

		// Update view containers
		Chick.app.findViewContainers();

	};


	ViewContainer.prototype.isLastSetBy = function(byRoute, byRouteParams) {

		// Not set before?
		if (this.lastSetByRoute === false) return false;

		// Check route id.
		if (byRoute.id === this.lastSetByRoute.id) {
			// Compare the parameters.
			if (JSON.stringify(byRouteParams) === JSON.stringify(this.lastSetByRouteParams)) {
				return true;
			}

		}

		// Nope. This is a different route
		return false;


	};


})(Chick);

'use strict';
(function(ns) {

	/**
	 * Create new Chick Application
	 * @param {element} $target   The target element to create the application in
	 * @param {array} options     Optional options array for configuration
	 */
	function App($target, options) {

		// Register my events
		this.__registerEvents(['resize', 'ready']);

		// Localize
		var app = this;
		this.$app = $target;
		this.settings = ns.extend(true, {

			baseUrl: '/',

			i18n: {
				bundles: []
			},

			languageInUrl: false,
			debug: true

		}, options);

		// Status variables
		this.readyPromises = [];
		
		// Error handlers
		this.__errorHandlers = {

		};
		this.__defaultErrorViewContainer = 'main';

		// Elements for future use
		this.$window = $(window);
		this.$body = $('body');
		this.$container = this.$app.parent();
		this.$document = $(document);

		// Views
		this.viewContainers = {};
		
		// Create a router
		this.router = new ns.Core.Router({
			baseUrl: this.settings.baseUrl
		});

		// Create listeners and do one resize now
		this.__createListeners();
		this.__onResize();

		// Store my instance on the namespace
		ns.app = this;

		// Find views initially
		this.findViewContainers();


	}

	ns.register('Gui.App', ns.Core.TriggerClass, App);




	////////////////////
	// Public methods //
	////////////////////


	App.prototype.start = function() {

		// Detect language
		var app = this,
		language = app.router.detectLanguage();
		if (language !== false) {
			ns.Gui.I18n.setLanguage(language);
			ns.app.language = language;
		}

		// I18n as well?
		if (this.settings.i18n.bundles.length > 0) {
			for (var i in this.settings.i18n.bundles) {
				this.readyPromises.push(ns.Gui.I18n.load(this.settings.i18n.bundles[i]));
			}
		}

		// When all promises are done
		ns.when(this.readyPromises).then(function() {

			// Apply i18n
			if (app.settings.i18n.bundles.length > 0) ns.Gui.I18n.apply($('html'));

			// We're all done			
			app.trigger('ready');

			// Load first page.
			app.router.start();

			// Resize again
			app.__onResize();

		});



		return this;

	};


	App.prototype.findViewContainers = function($target) {

		var self = this;

		// All docu?
		if ($target === undefined) $target = this.$body;

		// Find <view> tags
		var foundViews = {};
		$target.find('view, [view]').each(function(index, view) {
			
			// Register
			var $view = $(view),
				name = $view.is('view') ? $view.attr('name') : $view.attr('view');

			if (!name) throw 'RoutingError: You need to define the name attribute for each <view>.';

			// New view?			
			foundViews[name] = $view;

		});

		// Views disappeared?
		_.each(_.difference(_.keys(this.viewContainers), _.keys(foundViews)), function(key) {
			delete self.viewContainers[key];
		});

		// Loop and add or merge
		_.each(foundViews, function($el, key) {

			if (self.viewContainers[key] === undefined) {
				
				// Add it.
				self.viewContainers[key] = new Chick.Gui.ViewContainer(key, $el);

			} else {

				// Set element
				self.viewContainers[key].setTarget($el);

			}

		});

	};

	App.prototype.getViewContainer = function(key) {

		// Do I know it?
		if (this.viewContainers[key] === undefined) throw 'RoutingError: Unknown view container "' + key + '"';

		return this.viewContainers[key];


	};

	App.prototype.ready = function(callback) {

		var app = this;
		this.__promiseReady.then(function() {
			callback.apply(app);
		});
		return this;

	};

	App.prototype.routes = function(callback) {

		// Run callback in the context of the router
		callback.apply(this.router);

		return this;

	};

	App.prototype.errors = function(errorHandlers, defaultErrorViewContainer) {

		// Merge the errors
		this.__errorHandlers = ns.extend(this.__errorHandlers, errorHandlers);
		if (defaultErrorViewContainer !== undefined) this.__defaultErrorViewContainer = defaultErrorViewContainer;
		return this;		

	};

	App.prototype.handleError = function(code, message, targetViewContainer) {

		// Which target view
		targetViewContainer = this.getViewContainer(targetViewContainer === undefined ? this.__defaultErrorViewContainer : targetViewContainer);

		// Custom handler?
		if (this.__errorHandlers[code] !== undefined) {

			// Execute the handler
			var errorResult = this.__errorHandlers[code](message),
			app = this;

			if (ns.Gui.View.prototype.isPrototypeOf(errorResult)) {

				errorResult.render().then(function(result) {
					targetViewContainer(result);
				});
				
			} else if (ns.isPromise(errorResult))  {
				
				errorResult.then(function(result) {
					targetViewContainer.setContent(result);
				});

			} else {
				targetViewContainer.setContent(errorResult);
			}

		} else {

			// Set content.
			targetViewContainer.setContent('Error ' + code);

		}

	};

	App.prototype.abort = function(code, message) {
		return this.handleError(code, message);
	};


	App.prototype.isMobile = function() {
		return window.innerWidth < 750;
	};

	App.prototype.switchLanguage = function(lang) {

		this.router.switchLanguage(lang);

	};




	/////////////////////
	// Private methods //
	/////////////////////


	App.prototype.__createListeners = function() {

		// Resize
		var app = this;
		//$(window).on('resize', function() { app.__onResize(); });
		var lastWidth, lastHeight,
			resizeTimeout = false;
		window.setInterval(function() {


			var isChanged = false;
			if (window.innerWidth !== lastWidth) {
				lastWidth = window.innerWidth;
				isChanged = true;
			}
			if (window.innerHeight !== lastHeight) {
				lastHeight = window.innerHeight;
				isChanged = true;
			}
			if (isChanged) {
				if (resizeTimeout !== false) {
					window.clearTimeout(resizeTimeout);
				}
				resizeTimeout = window.setTimeout(function() {
					app.__onResize();
					resizeTimeout = false;
				}, 50);
			}

		}, 25);


		//////////////////////////
		// Listen to the router //
		//////////////////////////

		this.router.on('error', function(code, message, targetViewContainer) {
			app.handleError(code, message, targetViewContainer);
		});

	};


	////////////
	// Events //
	////////////

	App.prototype.__onResize = function() {

		// Trigger it with a little delay
		var app = this;
		app.trigger('resize');
		

	};






	
	// Static constructor
	ns.createApplication = function($target, options) {

		var app = new ns.Gui.App($target, options);
		return app;

	};

	// Add a url function
	ns.url = function(path) {

		// Is it an anchor link?
		if (path[0] === '#') {
			path = ns.app.router.lastRequest.uri + path;
		}

		// Base url.
		var url = ns.app.settings.baseUrl;
		if (url === '/') url = '';
			
		// Add language?
		if (ns.app.language !== undefined && ns.app.settings.languageInUrl === true) {
			url = url + '/' + ns.app.language;
		}

		// And the path
		return url + path;

	};



})(Chick);