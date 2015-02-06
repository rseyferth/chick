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