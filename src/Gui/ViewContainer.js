'use strict';
(function(ns) {

	function ViewContainer(name, $target) {
	
		// Localize
		var self = this;
		this.name = name;
		this.$target = $target;

		this.lastSetByRoute = false;
		this.lastSetByRouteParams = false;

		// Store me on the view container
		this.$target.data('viewcontainer', this);

	}
	ns.register('Gui.ViewContainer', ns.Core.TriggerClass, ViewContainer);
	


	ViewContainer.prototype.setTarget = function($el) {

		// Is the element the same?
		if ($el[0] === this.$target[0]) return;

		// Set it
		this.$target = $el;

		// That means we can assume that this will have to be reset by another route.
		this.lastSetByRoute = false;
		this.lastSetByRouteParams = false;

	};

	ViewContainer.prototype.setContent = function(html, byRoute, byRouteParams) {

		// Store last route (this is to check whether the viewcontainer needs a refresh is a sub-page is loaded)
		this.lastSetByRoute = byRoute ? byRoute : false;
		this.lastSetByRouteParams = byRouteParams;

		// Set it.
		this.$target.html(html);

		// Update view containers
		Chick.app.findViewContainers();

	};


	ViewContainer.prototype.isLastSetBy = function(byRoute, byRouteParams) {

		// Not set before?
		if (this.lastSetByRoute === false) return false;

		// Check route id.
		if (byRoute.id === this.lastSetByRoute.id) {
			// Compare the parameters.
			if (JSON.stringify(byRouteParams) === JSON.stringify(this.lastSetByRouteParams)) {
				return true;
			}

		}

		// Nope. This is a different route
		return false;


	};


})(Chick);
