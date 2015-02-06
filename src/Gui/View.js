'use strict';
(function(ns) {

	function View(source) {
	
		this.data = {};
		this.source = source;

		this.template = null;
		this.__loadPromise = undefined;
		this.__waitFor = [];
		
		this.$element = $('<div class="view"></div>').addClass(inflection.dasherize(source).replace('/', '-'));

		this.__registerEvents(['ready', 'leave']);

	}
	ns.register('Gui.View', ns.Core.TriggerClass, View);
	



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
		return this.withData(key, apiCallOrCollection, function(promise, data) {

			// Process
			var records = data.records;
			if (processCallback !== undefined) {
				var result = processCallback(records);
				if (result !== undefined) records = result;
			}

			// Return the collection
			promise.resolve(records);

		});

	};
	View.prototype.withModel = function(key, apiCallOrModel, processCallback) {

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




	View.prototype.load = function() {

		// One promise to handle loading of the view
		if (this.__loadPromise !== undefined) return this.__loadPromise;
		this.__loadPromise = ns.promise();
		this.__waitFor.push(this.__loadPromise);

		// Load the file
		var view = this;
		$.ajax({
			url: View.path + this.source + '.jt'
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

		// Create a promise
		var promise = ns.promise();

		// Load the template.
		this.load();

		// When loading is done. (and also any DATA calls)
		var view = this;
		ns.when(this.__waitFor).then(function() {

			// Now run the template into my element
			view.$element.html(view.template.run(view.data));

			// Enable the content
			ns.enableContent(view.$element);

			// Now run it with my data
			promise.resolve(view.$element);
			
			// Ready callbacks
			view.trigger('ready');
			View.any.trigger('ready', view);

		});



		return promise;

	};





	// Static instantiator
	View.make = function(source) {

		// Create it
		var view = new View(source);

		return view;

	};

	// Global events.
	View.any = new Chick.Core.TriggerClass();
	View.any.__registerEvents(['ready']);

	// Static path setter
	View.path = 'views/';



})(Chick);