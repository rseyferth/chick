'use strict';
(function(ns) {

	function EnabledContent($target) {
	
		this.$target = $target;
		this.template = new ns.Gui.Template($target.find('script[text/html]').text());

		this.template.use($target);

	}
	ns.register('Gui.EnabledContent', ns.Core.TriggerClass, EnabledContent);

})(Chick);