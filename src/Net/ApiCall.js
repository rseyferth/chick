'use strict';
(function(ns) {

	function ApiCall(path, params, ajaxOptions, options) {

		// Check parameters
		var data = null;
		if (typeof params === 'string') {
			path += '/' + path;
		} else if (typeof params === 'object') {

			// Include?
			if (params.include !== undefined && typeof params.include !== 'string'){
				params.include = params.include.join(',');
			}


			// Use it.
			data = params;
		}

		// Create url
		var url = ns.Net.Api.createUrl(path);

		// Check options
		ajaxOptions = _.extend({
			type: 'get',			
			data: data || {},
			url: url,
			headers: {
				'X-Api-Key': ns.Net.Api.config.key
			}
		}, ajaxOptions || {});
		
		options = _.extend({
			allowCache: false,
			cacheExpire: undefined,
			model: false,
			handleErrors: true
		}, options || {});

		

		// Create a cache-key to lookup
		var apiCall = this;
		if (options.allowCache === true	) {

			var cacheKey = ajaxOptions.type.toUpperCase() + ' ' + url + '?' + $.param(ajaxOptions.data),
				cachedResult = ns.Net.Api.cache(cacheKey);

			// Found?
			if (cachedResult !== undefined) {

				// Use this!
				var apiResult = new ns.Net.ApiResult($.parseJSON(cachedResult), path, { model: options.model });
				apiCall.resolve(apiResult, cachedResult);
				return;

			}

		}

		// Do we have CORS support?
		if ($.support.cors === false) {

			// Use JSONP protocol instead
			ajaxOptions.dataType = 'jsonp';
			ajaxOptions.data.alt = 'jsonp';
			ajaxOptions.data.api_key = ns.Net.Api.config.key;
			
		}
		
		//console.log('[API] ' + options.type.toUpperCase() + ' ' + url);

		// Make the ajax call
		this.ajaxCall = $.ajax(ajaxOptions).done(function(result, textStatus, xhr) {

			// Parse the result
			var apiResult = new ns.Net.ApiResult(result, path, { model: options.model });
			apiCall.resolve(apiResult, xhr.responseText);

			// Cache it?
			if (options.allowCache === true) {

				// Remember this result!
				ns.Net.Api.cache(cacheKey, xhr.responseText, options.cacheExpire);

			}

		}).fail(function(error) {

			apiCall.reject(error);
			if (options.handleErrors !== false)	ApiCall.any.trigger('error', error);			
			
		});


	}

	ns.register('Net.ApiCall', ns.Core.Promise, ApiCall);

	ApiCall.prototype.abort = function() {

		this.ajaxCall.abort();
		return this;

	};




	ApiCall.any = new ns.Core.TriggerClass();
	ApiCall.any.__registerEvents(['error']);







})(Chick);