/**
 * Sherlock
 * Copyright (c) 2012 Tabule, Inc.
 * Version 1.0
 */

var Sherlock = (function() {

	var patterns = {
		rangeSplitters: / (to|\-|(?:un)?til|through) /,

		// oct, october
		months: "\\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\b",
		// 3, 31, 31st
		days: "\\b([0-3]?\\d)(?:st|nd|rd|th)?(?:,)?\\b",
		// 2012, 12
		//year: "((?: 20)?1\d)?",

		// 5/12, 5.12, 5-12
		shortForm: /\b([0-1]?\d)(?:\/|\-|\.)([0-3]?\d)/, // to add year support, use: /\b([0-1]?\d)(?:\/|\-|\.)([0-3]?\d)((?:\/|\-|\.)(?:20)?1\d)?\b/

		// tue, tues, tuesday
		weekdays: /(?:next )?\b(sun|mon|tue(?:s)?|wed(?:nes)?|thurs|fri|sat(?:ur)?)(?:day)?\b/,
		relativeDate: /\b(next (?:week|month)|tom(?:orrow)?|today)\b/,
		inRelativeDate: /\b(\d{1,2}) (day|week|month)s?\b/,

		inRelativeTime: /\b(\d{1,2}) (hour|min(?:ute)?)s?\b/,
		midtime: /\b(noon|midnight)\b/,
		// 5, 12pm, 5:00, 5:00pm
		explicitTime: /\b(?:at )?([0-1]?\d)(?::([0-5]\d))? ?([ap]\.?m?\.?)?\b/,
		hoursOnly: /^[0-1]?\d$/,

		fillerWords: /\b(from|is|at|on|for|in)\b/
	},

	parser = function(str, time, startTime) {
		var ret = {},
			dateMatch = false,
			timeMatch = false;

		// parse date
		if (dateMatch = helpers.relativeDate.matcher(str, time)	||
					helpers.weekday.matcher(str, time)			||
					helpers.explicitDate.matcher(str, time, startTime))
			str = str.replace(dateMatch, '');

		// parse time
		if (timeMatch = helpers.hour.matcher(str, time))
			str = str.replace(timeMatch, '');

		ret.eventTitle = str.split(patterns.fillerWords)[0].trim();

		// if time data not given, then this is an all day event
		ret.isAllDay = !!(dateMatch && !timeMatch);

		// check if date was parsed
		ret.isValidDate = !!(dateMatch || timeMatch || str.match(/\bnow\b/));

		return ret;
	},

	helpers = {
		hour: {
			matcher: function(str, time) {
				var match;
				if (match = str.match(patterns.inRelativeTime))
					switch(match[2]) {
						case "hour":
							time.setHours(time.getHours() + parseInt(match[1]));
							return match[0];
						case "min":
							time.setMinutes(time.getMinutes() + parseInt(match[1]));
							return match[0];
						case "minute":
							time.setMinutes(time.getMinutes() + parseInt(match[1]));
							return match[0];
						default:
							break;
					}

				if (match = str.match(patterns.midtime))
					switch(match[1]) {
						case "noon":
							time.setHours(12, 0, 0);
							return match[0];
						case "midnight":
							time.setHours(0, 0, 0);
							return match[0];
						default:
							break;
					}

				if (match = str.match(new RegExp(patterns.explicitTime.source, "g"))) {
					// if multiple matches found, pick the best one
					match = match.sort(function (a, b) { return b.length - a.length; })[0];
					if (match.length <= 2 && str.length > 2)
						return false;
					match = match.match(patterns.explicitTime);

					var hour = parseInt(match[1])
					,	min = match[2] || 0
					,	meridian = match[3];

					if (meridian) {
						// meridian is included, adjust hours accordingly
						if (meridian.indexOf('p') === 0 && hour != 12)
							hour += 12;
						else if (meridian.indexOf('a') === 0 && hour == 12)
							hour = 0;
					} else if (hour < 12 && (hour < 7 || hour < time.getHours()))
						// meridian is not included, adjust any ambiguous times
						// if you type 3, it will default to 3pm
						// if you type 11 at 5am, it will default to am,
						// but if you type it at 2pm, it will default to pm
						hour += 12;

					time.setHours(hour, min, 0);
					return match[0];
				}

				return false;
			}
		},

		// match a relative date
		relativeDate: {
			matcher: function(str, time) {
				var match;
				if (match = str.match(patterns.relativeDate))
					switch(match[1]) {
						case "next week":
							time.setDate(time.getDate() + 7);
							return match[0];
						case "next month":
							time.setMonth(time.getMonth() + 1);
							return match[0];
						case "tom":
							time.setDate(time.getDate() + 1);
							return match[0];
						case "tomorrow":
							time.setDate(time.getDate() + 1);
							return match[0];
						case "today":
							return match[0];
						default:
							break;
					}
				
				if (match = str.match(patterns.inRelativeDate))
					switch(match[2]) {
						case "day":
							time.setDate(time.getDate() + parseInt(match[1]));
							return match[0];
						case "week":
							time.setDate(time.getDate() + parseInt(match[1])*7);
							return match[0];
						case "month":
							time.setMonth(time.getMonth() + parseInt(match[1]));
							return match[0];
						default:
							break;
					}
				
				return false;
			}
		},

		// match an explicit date
		explicitDate: {
			matcher: function(str, time, startTime) {
				var match
				,	month
				,	day;
				//,	year;

				if (match = str.match(patterns.monthDay)) {
					month = this.changeMonth(match[1]);
					day   = match[2];
					//year  = match[3];
				} else if (match = str.match(patterns.dayMonth)) {
					month = this.changeMonth(match[2]);
					day   = match[1];
					//year  = match[3];
				} else if (match = str.match(patterns.shortForm)) {
					month = match[1] - 1;
					day   = match[2];
					//year  = match[3];
				} else if (match = str.match(new RegExp(patterns.days, "g"))) {
					// if multiple matches found, pick the best one
					match = match.sort(function (a, b) { return b.length - a.length; })[0];
					if (!(startTime && startTime.isAllDay) && 
						match.length <= 2 && 
						match.match(patterns.hoursOnly))
						return false;
					match = match.match(patterns.daysOnly);
					month = time.getMonth();
					day = match[1];

					// if this date is in the past, move it to next month
					if (day < time.getDate())
						month++;
				} else
					return false;

				time.setMonth(month, day);

				// if (year) {
				// 	if (year < 2000)
				// 		year += 2000;

				// 	time.setFullYear(year);
				// }

				// if the new date we've entered is in the past, move it to next year
				if (time < new Date())
					time.setFullYear(time.getFullYear() + 1);

				return match[0];
			},

			changeMonth: function(month) {
				switch(month.substr(0, 3)) {
					case "jan":
						return 0;
					case "feb":
						return 1;
					case "mar":
						return 2;
					case "apr":
						return 3;
					case "may":
						return 4;
					case "jun":
						return 5;
					case "jul":
						return 6;
					case "aug":
						return 7;
					case "sep":
						return 8;
					case "oct":
						return 9;
					case "nov":
						return 10;
					case "dec":
						return 11;
					default:
						return null;
				}
			}
		},

		// match any occurence of a weekday
		weekday: {
			matcher: function(str, time) {
				var match = str.match(patterns.weekdays);
				if (match)
					switch (match[1].substr(0, 3)) {
						case "sun":
							this.changeDay(time, 0);
							return match[0];
						case "mon":
							this.changeDay(time, 1);
							return match[0];
						case "tue":
							this.changeDay(time, 2);
							return match[0];
						case "wed":
							this.changeDay(time, 3);
							return match[0];
						case "thu":
							this.changeDay(time, 4);
							return match[0];
						case "fri":
							this.changeDay(time, 5);
							return match[0];
						case "sat":
							this.changeDay(time, 6);
							return match[0];
						default:
							break;
					}
				return false;
			},

			changeDay: function(time, newDay) {
				var diff = 7 - time.getDay() + newDay;
				if (diff > 7)
					diff -= 7;
				time.setDate(time.getDate() + diff);
			}
		},

		escapeRegExp: function(str) {
		  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		}
	};

	// may 5, may 5th
	patterns.monthDay = new RegExp(patterns.months + " "  + patterns.days); // add `+ patterns.year` to add year support
	// 5th may, 5 may
	patterns.dayMonth = new RegExp(patterns.days + "(?: of)? " + patterns.months); // add `+ patterns.year` to add year support
	// 5, 5th
	patterns.daysOnly = new RegExp(patterns.days);

	return {
		// parses a string and returns an array of up to 4 elements
		// 0: first date object
		// 1: is first date an all-day event?
		// 2: second date object
		// 3: is second date an all-day event?
		parse: function(str) {
			var date = new Date(),
				// Check if Watson is around. If not, pretend like he is to keep Sherlock company.
				result = (typeof Watson !== 'undefined') ? Watson.preprocess(str) : [str, {}],
				str = result[0],
				ret = result[1],
				// token the string to start and stop times
				tokens = str.toLowerCase().split(patterns.rangeSplitters);

			// parse the start date
			if ((result = parser(tokens[0], date, null)) !== null) {
				if (result.isAllDay)
					// set to midnight
					date.setHours(0, 0, 0);

				ret.isAllDay = result.isAllDay;
				ret.eventTitle = result.eventTitle;
				ret.startDate = result.isValidDate ? date : null;
			}

			// parse the 2nd half of the date range, if it exists
			if (tokens.length > 1) {
				date = new Date(date.getTime());
				// parse the end date
				if ((result = parser(tokens[2], date, ret)) !== null) {
					if (ret.isAllDay)
						// set to midnight
						date.setHours(0, 0, 0);

					if (result.eventTitle.length > ret.eventTitle.length)
						ret.eventTitle = result.eventTitle;

					ret.endDate = result.isValidDate ? date : null;
				}
			} else
				ret.endDate = null;

			// get capitalized version of title
			if (ret.eventTitle) {
				ret.eventTitle = ret.eventTitle.replace(/ (?:\.|!|,|;)+/g, '');
				var match = str.match(new RegExp(helpers.escapeRegExp(ret.eventTitle), "i"));
				if (match)
					ret.eventTitle = match[0].replace(/ +/g, ' ').trim(); // replace multiple spaces
			} else
				ret.eventTitle = null;

			if (typeof Watson !== 'undefined')
				Watson.postprocess(ret);
			return ret;
		}
	};
})();
