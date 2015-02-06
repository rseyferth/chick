'use strict';

var ns = Chick.register('Net.Api', {

	config: {

		baseUrl: '/api/v1',
		key: ''

	},


	/**
	 * Configure the Chick API connector
	 *
	 * Options for the configuration are:
	 *
	 * 	baseUrl		{string}		The prefix for each api url (default = /api/v1)
	 * 
	 * @param  {array} options  Associative array with 
	 * @return {array} The now active configuration
	 */	
	configure: function(options) {

		return _.extend(this.config, options);

	},

	call: function(path, params, ajaxOptions, options) {

		// Create the api call
		return new Chick.Net.ApiCall(path, params, ajaxOptions, options);

	},

	createUrl: function(path) {

		var url = this.config.baseUrl + path;
		return url;

	},


	cache: function(key, value, expires) {

		// Value?
		if (value !== undefined) {

			// Add expiry date
			if (expires === undefined) {
				expires = moment().add(24, 'hours');
			} else if (typeof expires === 'number') {
				expires = moment().add(expires, 'seconds');
			}
			value = expires.format() + value;			

			// Store it
			localStorage['Chick-api-cache.' + key] = value;

		} else {

			// Get value
			value = localStorage['Chick-api-cache.' + key];
			if (!value) return;

			// Get the expiry
			var now = moment(),
				then = moment(value.substr(0, moment().format().length));
			if (then.isValid() === false) return;

			// Compare dates
			if (now.unix() > then.unix()) return;

			// Value is still valid.
			return value.substr(moment().format().length);

		}

	}




});

// Register generic api function shortcut
Chick.api = function() {
	return ns.call.apply(ns, arguments);
};

