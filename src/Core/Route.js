'use strict';
(function(ns) {

	function Route(pattern, options) {
	
		// Store the pattern
		this.pattern = pattern;

		// Localize the options
		var settings = ns.extend({
			action: 'index',
			method: 'get'
		}, options);
		this.controller = settings.controller;
		this.action = settings.action;
		this.method = settings.method;
		this.view = false;
		this.parameterRestrictions = {};
		this.hasRestrictions = false;
	
	}

	ns.register('Core.Route', Route);



	/////////////////////
	// Public function //
	/////////////////////

	Route.prototype.match = function(request) {

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


	Route.prototype.execute = function(request) {
		
		// Method first
		if (typeof request === 'string') {
			request = new ns.Core.Request(request);
		}
		if (request.method !== this.method) return false;


		// Get params
		var match = this.regex.exec(request.uri),
			params = match.slice(1, 1 + this.parameters.length);

		// Create the controller
		var ControllerClass = this.controller,
		controller = new ControllerClass();
		controller.setRequest(request);
		if (controller[this.action] === undefined) throw 'The controller does not have a method ' + this.action;

		// Get the result
		var response = controller[this.action].apply(controller, params);
		return this.__processResponse(response);

	};

	Route.prototype.leave = function() {

		// Did we have a view?
		if (this.view) {
			this.view.trigger('leave');
		}


	};

	Route.prototype.having = function(parameter, regex) {

		// Store it
		if (this.parameterRestrictions[parameter] === undefined) this.parameterRestrictions[parameter] = [];
		this.parameterRestrictions[parameter].push(regex);
		this.hasRestrictions = true;
		return this;


	};



	///////////////////////
	// Private functions //
	///////////////////////

	Route.prototype.__processResponse = function(response, promise) {

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
				route.__processResponse(result, promise);
			});
			

		} else {

			// Resovle the promise with the data itself
			promise.resolve(response);

		}

		return promise;

	};

	Route.prototype.__createRegEx = function() {

		// Convert variables in pattern
		var params = [],
		p = this.pattern.replace(/\/:([a-zA-Z]+)/g, function(match) {
			params.push(match.replace(/\/:/, ''));
			return '/([-a-zA-Z0-9,]+)';
		});

		// Remove trailing slash and escape 'em
		p = p.replace(/\/$/, '');
		p = p.replace(/\//g, '\\\/');
		
		// Create regex version of the pattern
		this.regex = new RegExp('^' + p + '$');
		this.parameters = params;
		
	};





})(Chick);
