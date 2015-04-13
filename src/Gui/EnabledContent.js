'use strict';
(function(ns) {

	function EnabledContent($target, data) {
	
		this.$target = $target;
		this.template = new ns.Gui.Template($target.find('script[type="text/html"]').text());
		this.template.use(data, $target);

	}
	ns.register('Gui.EnabledContent', ns.Core.TriggerClass, EnabledContent);

})(Chick);