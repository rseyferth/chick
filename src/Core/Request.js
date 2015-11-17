'use strict';
(function(ns) {

	function Request(url, router) {
	
		// No url?
		if (url === undefined) url = window.location;

		// And router?
		if (router === undefined) router = ns.app.router;

		// Default info
		this.uri = null;
		this.data = {};
		this.method = 'get';
		this.language = false;
		this.anchor = false;
		
		// Make sure it's string, not a Location instance
		if (typeof url !== 'string') url = '' + url;
		this.url = url;

		// Remove protocol and hostname
		url = '/' + url.replace(/^http(s)?\:\/\/[a-zA-Z\.0-9\:\-]+\//, '');

		// Check data
		var queryIndex = url.indexOf('?');
		if (queryIndex !== -1) {

			// Parse the querystring
			var query = url.substr(queryIndex + 1),
				pairs = query.split(/\&/);
			for (var p in pairs) {

				// Split it on =
				var pair = pairs[p].replace(/\+/g, ' ').split(/=/),
					key = decodeURIComponent(pair[0]),
					value = decodeURIComponent(pair[1]);

				// Is the key part of an array?
				var rg = /\[([a-zA-Z0-9]*)\]/g,
					arrayMatch,
					data = this.data;
				while (null !== (arrayMatch = rg.exec(key))) {
					
					// Drop into array
					var arrayKey = arrayMatch[1],
						baseKey = key.substr(0, arrayMatch.index);
					
					if (data[baseKey] === undefined) data[baseKey] = {};
					data = data[baseKey];
					key = arrayKey;


				}
				data[key] = value;
			}


			// Remove from url
			url = url.substr(0, queryIndex);

		}

		// Anchors?
		var anchorParts = url.split(/#/);
		if (anchorParts.length > 1) {
			url = anchorParts[0];
			this.anchor = anchorParts[1];
		}


		// Store full path
		this.fullPath = url;

		// Remove base url
		if (router.baseUrl.length > 0 && url.indexOf(router.baseUrl) === 0) {
			url = url.substr(router.baseUrl.length);
		}



		// Is there a language in the url?
		if (router.languageRegex !== false) {

			// Does it match?
			var langResult = router.languageRegex.exec(url);
			if (langResult) {

				// Use that language
				this.language = langResult[1];

				// Remove from the url.
				url = url.substr(langResult[0].length);

			} else {

				this.language = router.settings.languages[0];

			}

		}


		// Remove trailing slash
		url = url.replace(/\/$/, '');


		

		// Store url
		this.uri = url;
		

	}



	ns.register('Core.Request', Request);

})(Chick);
