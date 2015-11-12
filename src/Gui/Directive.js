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
				if (/^chick\-/.test(attr.name)) {

					// Evaluate the attribute's value
					var name = _.camelize(attr.name.substr(6)),
						func = function() {
							return eval(attr.value);
						}
						value = func.call(data);

					// Store!
					options[name] = value;

				} else {

					// Convert value into proper type
					var value = attr.value;
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
