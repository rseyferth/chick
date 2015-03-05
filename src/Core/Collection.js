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
