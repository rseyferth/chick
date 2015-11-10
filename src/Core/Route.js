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
				console.log(combinedResult);
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
			.replace(/\/:([a-zA-Z]+)/g, function(match) {
				params.push(match.replace(/\/:/, ''));
				return '/([-a-zA-Z0-9,]+)';
			})

			// as will "{name}"
			.replace(/\/{([a-zA-Z]+)}/g, function(match) {
				params.push(match.replace(/\/:/, ''));
				return '/([-a-zA-Z0-9,]+)';
			})

			// "#name" will match any single number
			.replace(/\/\#([a-zA-Z]+)/g, function(match) {
				params.push(match.replace(/\/:/, ''));
				return '/([0-9]+)';
			});



		// Remove trailing slash and escape 'em
		p = p.replace(/\/$/, '');
		p = p.replace(/\//g, '\\\/');
		
		// Create regex version of the pattern
		this.regex = new RegExp('^' + p + '$');
		this.parameters = params;
		
	};





})(Chick);
