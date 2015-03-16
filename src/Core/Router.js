'use strict';
(function(ns) {

	function Router(options) {
	
		// Register my events
		this.__registerEvents(['pageLoadStart', 'pageLoadComplete', 'error', 'pageNotFound', 'selectLanguage']);

		// The default options
		this.settings = ns.extend({

			baseUrl: '/',
			catchLinks: true,
			catchForms: true,
			languages: false,
			refreshOnLanguageSwitch: true


		}, options);

		// Localize some settings
		this.baseUrl = this.settings.baseUrl.replace(/\/$/, '');
		this.languageRegex = false;

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
				//	if (!Modernizr.touch) {
						History.pushState(null, null, $(this).attr('href'));
				//	}
				});
/*
				// For mobile, register the tap events
				if (Modernizr.touch) {

					$btns.each(function(index, el) {
						var hammer = new Hammer(el);
						hammer.on('tap', function(e) {
							History.pushState(null, null, $(el).attr('href'));
						});
					});


				}
*/

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

	Router.prototype.get = function(pattern, options) {
		options.method = 'get';
		return this.add(pattern,options);
	};

	Router.prototype.post = function(pattern, options) {
		options.method = 'post';
		return this.add(pattern,options);
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


	Router.prototype.add = function(pattern, options) {

		// Create the route
		var route = new ns.Core.Route(pattern, options);
		this.routes.push(route);
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
					self.trigger('pageLoadComplete', result);

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
