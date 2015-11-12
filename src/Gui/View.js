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
		if (typeof apiCallOrModel === 'object' && !Chick.Core.Model.prototype.isPrototypeOf(apiCallOrModel)
			&& !Chick.Net.ApiCall.prototype.isPrototypeOf(apiCallOrModel)) {

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
