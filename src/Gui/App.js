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

			classes: {
				app: 'chick-application',
				interface: 'chick-content'			
			},

			interface: {

				

			},

			languageInUrl: true,

			debug: true

		}, options);

		// Status variables
		this.readyPromises = [];
		
		// Error handlers
		this.__errorHandlers = {

		};


		// Elements for future use
		this.$window = $(window);
		this.$body = $('body');
		this.$container = this.$app.parent();
		this.$document = $(document);

		// Add the app class
		this.$app.addClass(this.settings.classes.app);

		// Create a router
		this.router = new ns.Core.Router({
			baseUrl: this.settings.baseUrl
		});
		this.router.on('error', function(code) {
			app.handleError(code);
		});

		// Create listeners and do one resize now
		this.__createListeners();
		this.__onResize();

		// Store my instance on the namespace
		ns.app = this;

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

			// Create the interface
			app.__createInterface();

			// We're all done			
			app.trigger('ready');

			// Load first page.
			app.router.start();

			// Resize again
			app.__onResize();

		});

		return this;

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

	App.prototype.errors = function(errorHandlers) {

		// Merge the errors
		this.__errorHandlers = ns.extend(this.__errorHandlers, errorHandlers);
		return this;		

	};

	App.prototype.handleError = function(code, message) {

		// Custom handler?
		if (this.__errorHandlers[code] !== undefined) {

			// Execute the handler
			var errorResult = this.__errorHandlers[code](message),
			app = this;

			if (ns.Gui.View.prototype.isPrototypeOf(errorResult)) {

				errorResult.render().then(function(result) {
					app.interface.setContent(result);
				});
				
			} else if (ns.isPromise(errorResult))  {
				
				errorResult.then(function(result) {
					app.interface.setContent(result);
				});
			} else {
				this.interface.setContent(errorResult);
			}

		} else {

			// Set content.
			this.interface.setContent('Error ' + code);

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


	App.prototype.__createInterface = function() {

		// Interface already there?
		this.$interface = this.$app.find('.' + this.settings.classes.interface);
		if (this.$interface.length === 0) {

			// Create the interface element
			this.$interface = $('<div class="' + this.settings.classes.interface + '"><div>').appendTo(this.$app);

		}

		// Create the interface class
		this.interface = new ns.Gui.Interface(this.$interface, this.settings.interface);


	};

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