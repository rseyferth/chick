'use strict';
(function(ns) {

	function Interface($target, options) {

		// Defaultification
		this.settings = ns.extend({

			selectors: {
				template: 'script[type="text/html"]',
			},

			classes: {
				loading: 'loading',
				content: 'view-container'
			}


		}, options);

		// Localize
		this.$element = $target;

		// Template in here already?
		var $template = $target.find(this.settings.selectors.template);
		if ($template.length > 0) {

			// Render it
			ns.template($template.html(), {}, $target);

			// Enable the new content
			ns.enableContent($target);

		}

		// Create article
		this.$content = $target.find('.' + this.settings.classes.content);
		if (this.$content.length === 0) {
			this.$content = $('<div></div>').addClass(this.settings.classes.content).appendTo($target);
		}
		
		// Loading element
		this.$loading = $('<div class="' + this.settings.classes.loading + '"></div>');


		// Listen to the router
		var face = this;
		ns.app.router.on('pageLoadStart', function() {

			face.setLoading();

		}).on('pageLoadComplete', function(result) {

			face.setContent(result);
		
		});



	}
	ns.register('Gui.Interface', Interface);



	Interface.prototype.setLoading = function(isLoading) {
		if (isLoading === false) {
			this.$loading.remove();
		} else {
			this.$loading.insertAfter(this.$content);
		}
	};


	Interface.prototype.setContent = function(result, noLongerLoading) {

		// Replace content
		this.$content.html(result).removeClass(this.settings.classes.loading);

		// Scroll up
		this.$content.scrollTop(0);

		// Stop loading?
		if (noLongerLoading !== false) {
			this.setLoading(false);
		}

	};


})(Chick);
