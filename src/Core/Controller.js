'use strict';
(function(ns) {

	function Controller() {
	
	}


	Controller.prototype.setRequest = function(request) {
		this.request = request;
	};


	ns.register('Core.Controller', Controller);

})(Chick);
