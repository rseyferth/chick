'use strict';
(function(ns) {

	function Template(source, options) {

		// Create handlebars
		this.run = _.template(source, options);

	}
	ns.register('Gui.Template', Template);


	Template.prototype.use = function(data, $target) {

		$target.html(this.run(data));

		return $target;

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
