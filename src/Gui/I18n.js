'use strict';
(function(ns) {

	var I18n = ns.register('Gui.I18n');

	I18n.language = $('html').attr('lang') || 'en';
	I18n.baseUrl = 'lang/:lang/';

	I18n.data = {};

	I18n.numbers = {
		decimal: '.',
		thousands: ',',
		thousandsLength: 3,
		currency: {
			precision: 2
		}
	};



	I18n.setBaseUrl = function(url) {
		if (!/\/$/.test(url)) url = url + '/';
		I18n.baseUrl = url;
	};
	I18n.setLanguage = function(lang) {
		I18n.language = lang;

		// Apply to moment as well
		moment.locale(lang);

	};

	I18n.currencyFormat = function(number) {
		return I18n.numberFormat(number, I18n.numbers.currency.precision);
	};
	I18n.numberFormat = function(number, precision) {
		
		// The decimal part
		var nr = number.toFixed(precision);
		
		// Now look for thousands
		var parts = nr.split('.');
		if (parts[0].length > I18n.numbers.thousandsLength) {
			var rgx = /(\d+)(\d{3})/,
				whole = parts[0];
			while (rgx.test(whole)) {
				whole = whole.replace(rgx, '$1' + I18n.numbers.thousands + '$2');				
			}
			nr = whole + I18n.numbers.decimal + parts[1];
		} else {
			nr = nr.replace('.', I18n.numbers.decimal);
		}

		return nr;
	};



	I18n.switchLanguage = function(lang) {
		I18n.language = lang;
		I18n.apply();
	};

	I18n.apply = function($target) {

		// Find elements
		if ($target === undefined) $target = $('html');
		$target.find('[data-i18n]').each(function(el) {
			var $el = $(this),
				parts = $el.data('i18n').split(',');
			for (var i in parts) {

				// Split on :
				var attrAndValue = parts[i].split(':');
				if (attrAndValue.length === 1) {
					$el.text(I18n.get(attrAndValue[0]));
				} else {
					$el.attr(attrAndValue[0], attrAndValue[1]);
				}

			}

		});



	};

	I18n.replaceLocations = function(str) {

		// Get my locations
		var locs = I18n.get('locations.abbreviations');
		for (var key in locs) {
			var regex = new RegExp(key, 'gi');
			str = str.replace(regex, locs[key]);
		}
		return str;


	};

	I18n.load = function(bundleName, language, prefix) {

		// Form url
		if (language === undefined) language = I18n.language;
		var url = I18n.baseUrl.replace(':lang', language) + bundleName + '.json';

		// Apply to moment too
		moment.locale(language);
		
		// Get it.
		var promise = ns.promise();
		$.ajax({
			url: url
		}).then(function(result) {
			
			// Store the data
			var obj = I18n.data;
			if (prefix !== undefined) {
				obj = obj[prefix];
			}
			obj = ns.extend(obj, result);


			// Check number format
			if (obj.numbers !== undefined) {
				I18n.numbers = ns.extend(I18n.numbers, obj.numbers);
			}

			// Done.
			promise.resolve(result);

		});


		return promise;

	};

	I18n.get = function(key, variables) {
		var translation = ns.arrayGet(I18n.data, key, false);
		if (translation) {

			// Check variables
			if (variables !== undefined) {

				// Only 1 variable?
				if (typeof variables === 'string') {

					// Find the first variable match and replace it
					translation = translation.replace(/\:[a-zA-Z]+/, variables);
					
				} else if (typeof variables === 'object') {

					// Do a replace for each var
					_.each(variables, function(value, key) {
						translation = translation.replace(':' + key, value);
					});

				}

			}

			return translation;
		} else {
			return '[' + key + ']';
		}
	};




	
	// Register the global function
	window.trans = I18n.get;
	window.I18n = I18n;



})(Chick);
