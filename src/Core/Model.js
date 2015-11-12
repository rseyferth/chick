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
		var modelUrl = this.getApiUrl();
		return Chick.Net.Api.call(modelUrl, {}, {
			method: 'delete'
		}).then(function() {

			// Broadcast it broadly.
			Chick.broadcast(self.constructor.name + '.destroy', [self]);
		

		})
			



	};


	////////////////////
	// Static methods //
	////////////////////

	Model.create = function(className, startValues) {

		// Find the model class
		var ModelClass = ns.Models[className];
		if (ModelClass === undefined) throw "Unknown model class " + className;

		// Instantiate
		var model = new ModelClass();
		if (startValues) model.deserialize(startValues);

		return model;

	};





})(Chick);