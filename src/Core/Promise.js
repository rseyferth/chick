'use strict';
(function(ns) {

	function Promise() {

	}

	Promise.prototype.resolve = function() {
		this.__init();
		if (this.__isResolved || this.__isRejected) throw new Error('A Promise can only be resolved or rejected once.');
		this.__isResolved = true;
		this.__result = arguments;
		this.__callListeners('resolve');
		return this;
	};
	Promise.prototype.reject = function() {
		this.__init();
		if (this.__isResolved || this.__isRejected) throw new Error('A Promise can only be resolved or rejected once.');
		this.__isRejected = true;
		this.__result = arguments;
		this.__callListeners('reject');
		return this;
	};



	Promise.prototype.then = function(doneCallback, failCallback) {
		if (doneCallback !== undefined) this.__addListener('resolve', doneCallback);
		if (failCallback !== undefined) this.__addListener('reject', failCallback);
		return this;
	};

	Promise.prototype.always = function(callback) {
		this.__addListener('any', callback);
		return this;
	};

	Promise.prototype.done = function(callback) {
		this.__addListener('resolve', callback);
		return this;
	};
	Promise.prototype.fail = function(callback) {
		this.__addListener('reject', callback);
		return this;
	};


	Promise.prototype.__init = function() {
		if (this.__initialized === true) return;

		this.__isResolved = false;
		this.__isRejected = false;
		this.__result = undefined;

		this.__resolveListeners = [];
		this.__rejectListeners = [];
		this.__anyListeners = [];
		
		this.__initialized = true;
	};


	Promise.prototype.__callListeners = function(type) {
		var listeners = type === 'resolve' ? this.__resolveListeners : this.__rejectListeners;
		listeners = listeners.concat(this.__anyListeners);
		for (var i in listeners) {
			listeners[i].apply(null, this.__result);
		}
	};

	Promise.prototype.__addListener = function(type, callback) {

		this.__init();

		// Already resolved?
		if ((this.__isResolved && type === 'resolve') || 
			(this.__isRejected && type === 'reject') || 
			((this.__isRejected || this.__isResolved) && type === 'any')) {

			// Do the callback now
			callback.apply(null, this.__result);

		} else {

			// Find proper array
			if (type === 'resolve') {
				this.__resolveListeners.push(callback);
			} else if (type === 'reject') {
				this.__rejectListeners.push(callback);
			} else if (type === 'any') { 
				this.__anyListeners.push(callback);
			}

		}

	};




	ns.register('Core.Promise', Promise);

})(Chick);