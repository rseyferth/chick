'use strict';
(function(ns) {

	function ViewContainer(name, $target) {
	
		// Localize
		var self = this;
		this.name = name;
		this.$target = $target;

		this.lastSetByRoute = false;
		this.lastSetByRouteParams = false;


		// Listen to router
		Chick.app.router.on('pageLoadComplete', function(results) {

			// Does it apply to me?
			if (results[self.name] !== undefined) {

				// Set content
				self.setContent(results[self.name]);

			}

		});

	}
	ns.register('Gui.ViewContainer', ns.Core.TriggerClass, ViewContainer);
	


	ViewContainer.prototype.setTarget = function($el) {

		// Set it
		this.$target = $el;

		// That means we can assume that this will have to be reset by another route.
		this.lastSetByRoute = false;
		this.lastSetByRouteParams = false;

	};

	ViewContainer.prototype.setContent = function(html, byRoute, byRouteParams) {

		// Store last route (this is to check whether the viewcontainer needs a refresh is a sub-page is loaded)
		this.lastSetByRoute = byRoute;
		this.lastSetByRouteParams = byRouteParams;

		// Set it.
		this.$target.html(html);

		// Process it.
		Chick.enableContent(this.$target);

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
