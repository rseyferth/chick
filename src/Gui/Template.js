'use strict';
(function(ns) {

	function Template(source, options) {

		// Create handlebars
		this.__compiled = _.template(source, options);

	}
	ns.register('Gui.Template', Template);


	Template.prototype.run = function(data) {
		var result = this.__compiled(data);
		_.each(Template.hooks, function(cb) {
			result = cb(result, data);
		});
		return result;
	};

	Template.prototype.use = function(data, $target) {

		$target.html(this.run(data));

		return $target;

	};

	Template.hooks = [];

	Template.hook = function(cb) {
		Template.hooks.push(cb);
		return Template;
	};



	// Global
	ns.template = function(source, data, $target) {
		var templ = new Template(source);
		if ($target === undefined) {
			return templ.run(data);
		} else {
			return templ.use(data, $target);
		}

	};

})(Chick);
