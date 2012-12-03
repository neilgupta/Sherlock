/*!
 * Sherlock
 * Copyright (c) 2012 Tabule, Inc.
 * Version 1.0
 */

var Sherlock = (function() {

	var patterns = {
		rangeSplitters: /(\bto\b|\-|\b(?:un)?till?\b|\bthrough|and\b)/g,

		// oct, october
		months: "\\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\b",
		// 3, 31, 31st, fifth
		days: "\\b(?:(?:(?:on )?the )(?=\\d\\d?(?:st|nd|rd|th)))?([1-2]\\d|3[0-1]|0?[1-9])(?:st|nd|rd|th)?(?:,|\\b)",
		// 2012, 12
		//year: "((?: 20)?1\d)?",

		// 5/12, 5.12
		shortForm: /\b(0?[1-9]|1[0-2])(?:\/|\.)([1-2]\d|3[0-1]|0?[1-9])(?:(?:\/|\.)(?:20)?1\d)?\b/,
		// shortForm with years: /\b(0?[1-9]|1[0-2])(?:\/|\.)([1-2]\d|3[0-1]|0?[1-9])((?:\/|\.)(?:20)?1\d)?\b/,

		// tue, tues, tuesday
		weekdays: /(next (?:week (?:on )?)?)?\b(sun|mon|tue(?:s)?|wed(?:nes)?|thurs|fri|sat(?:ur)?)(?:day)?\b/,
		relativeDate: /\b(next (?:week|month)|tom(?:orrow)?|tod(?:ay)?|day after tom(?:orrow)?)\b/,
		inRelativeDate: /\b(\d{1,2}|a) (day|week|month)s?\b/,

		inRelativeTime: /\b(\d{1,2}|a|an) (hour|min(?:ute)?)s?\b/,
		midtime: /(?:@ ?)?\b(?:at )?(noon|midnight)\b/,
		// 0700, 1900, 23:50
		militaryTime: /\b(?:([0-2]\d):?([0-5]\d))(?! ?[ap]\.?m?\.?)\b/,
		// 5, 12pm, 5:00, 5:00pm, at 5pm, @3a
		explicitTime: /(?:@ ?)?\b(?:at |from )?(1[0-2]|[1-9])(?::([0-5]\d))? ?([ap]\.?m?\.?)?\b/,
		hoursOnly: /^(1[0-2]|0?[1-9])$/,

		fillerWords: / (from|is|at|on|for|in|(?:un)?till?)\b/
	},

	nowDate = null,

	getNow = function() {
		if (nowDate)
			return new Date(nowDate.getTime());
		else
			return new Date();
	},

	parser = function(str, time, startTime) {
		var ret = {},
			dateMatch = false,
			timeMatch = false,
			strNummed = helpers.strToNum(str);

		// parse date
		if (dateMatch = matchDate(strNummed, time, startTime))
			str = str.replace(new RegExp(helpers.numToStr(dateMatch)), '');

		// parse time
		if (timeMatch = matchTime(strNummed, time, startTime))
			str = str.replace(new RegExp(helpers.numToStr(timeMatch)), '');

		ret.eventTitle = str.split(patterns.fillerWords)[0].trim();

		// if time data not given, then this is an all day event
		ret.isAllDay = !!(dateMatch && !timeMatch);

		// check if date was parsed
		ret.isValidDate = !!(dateMatch || timeMatch || str.match(/\bnow\b/));

		return ret;
	},

	matchTime = function(str, time, startTime) {
		var match;
		if (match = str.match(patterns.inRelativeTime)) {
			// if we matched 'a' or 'an', set the number to 1
			if (isNaN(match[1]))
				match[1] = 1;

			switch(match[2]) {
				case "hour":
					time.setHours(time.getHours() + parseInt(match[1]));
					break;
				case "min":
					time.setMinutes(time.getMinutes() + parseInt(match[1]));
					break;
				case "minute":
					time.setMinutes(time.getMinutes() + parseInt(match[1]));
					break;
				default:
					return false;
			}
		} else if (match = str.match(patterns.midtime)) {
			switch(match[1]) {
				case "noon":
					time.setHours(12, 0, 0);
					break;
				case "midnight":
					time.setHours(0, 0, 0);
					break;
				default:
					return false;
			}
		} else if (match = str.match(patterns.militaryTime)) {
			time.setHours(match[1], match[2], 0);
		} else if (match = str.match(new RegExp(patterns.explicitTime.source, "g"))) {
			// if multiple matches found, pick the best one
			match = match.sort(function (a, b) { return b.length - a.length; })[0];
			if (match.length <= 2 && str.trim().length > 2)
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
		} else
			return false;

		var now = getNow();
		if (time < now)
			// the time has already passed today, go to tomorrow
			time.setDate(time.getDate() + 1);
		else if (time > now && startTime) {
			if (startTime.startDate > time) {
				if (str.length - match.length < 2)
					time.setDate(time.getDate() + 1);
				else
					startTime.startDate.setDate(startTime.startDate.getDate() - 1);
			}

			var temp = new Date(time.getTime()),
				startTemp = new Date(startTime.startDate.getTime());

			if (!startTime.isAllDay && 
				startTemp.getHours() <= now.getHours() && startTemp.getMinutes() <= now.getMinutes() && 
				startTemp.getDate() - 1 === now.getDate() && startTemp.getMonth() === now.getMonth() && startTemp.getFullYear() === now.getFullYear()) {
				startTemp.setDate(startTemp.getDate() - 1);
				temp.setDate(temp.getDate() - 1);
			}

			// allow date ranges that extend from past to future
			if (startTemp < now && temp > now) {
				startTime.startDate = startTemp;
				time.setDate(temp.getDate());
			}
		}

		return match[0];
	},

	matchDate = function(str, time, startTime) {
		var match
		,	month
		,	day;
		//,	year;

		if (match = str.match(patterns.monthDay)) {
			month = helpers.changeMonth(match[1]);
			day   = match[2];
			//year  = match[3];
		} else if (match = str.match(patterns.dayMonth)) {
			month = helpers.changeMonth(match[2]);
			day   = match[1];
			//year  = match[3];
		} else if (match = str.match(patterns.weekdays)) {
			month = time.getMonth();
			switch (match[2].substr(0, 3)) {
				case "sun":
					day = helpers.changeDay(time, 0, match[1]);
					break;
				case "mon":
					day = helpers.changeDay(time, 1, match[1]);
					break;
				case "tue":
					day = helpers.changeDay(time, 2, match[1]);
					break;
				case "wed":
					day = helpers.changeDay(time, 3, match[1]);
					break;
				case "thu":
					day = helpers.changeDay(time, 4, match[1]);
					break;
				case "fri":
					day = helpers.changeDay(time, 5, match[1]);
					break;
				case "sat":
					day = helpers.changeDay(time, 6, match[1]);
					break;
				default:
					return false;
			}
		} else if (match = str.match(patterns.relativeDate)) {
			var now = getNow();
			switch(match[1]) {
				case "next week":
					month = time.getMonth();
					day = time.getDate() + 7;
					break;
				case "next month":
					month = time.getMonth() + 1;
					day = time.getDate();
					break;
				case "tom":
					month = now.getMonth();
					day = now.getDate() + 1;
					break;
				case "tomorrow":
					month = now.getMonth();
					day = now.getDate() + 1;
					break;
				case "day after tomorrow":
					month = now.getMonth();
					day = now.getDate() + 2;
					break;
				case "day after tom":
					month = now.getMonth();
					day = now.getDate() + 2;
					break;
				case "today":
					month = now.getMonth();
					day = now.getDate();
					break;
				case "tod":
					month = now.getMonth();
					day = now.getDate();
					break;
				default:
					return false;
			}
		} else if (match = str.match(patterns.inRelativeDate)) {
			// if we matched 'a' or 'an', set the number to 1
			if (isNaN(match[1]))
				match[1] = 1;

			switch(match[2]) {
				case "day":
					month = time.getMonth();
					day = time.getDate() + parseInt(match[1]);
					break;
				case "week":
					month = time.getMonth();
					day = time.getDate() + parseInt(match[1])*7;
					break;
				case "month":
					month = time.getMonth() + parseInt(match[1]);
					day = time.getDate();
					break;
				default:
					return false;
			}
		} else if (match = str.match(patterns.shortForm)) {
			month = match[1] - 1;
			day   = match[2];
			//year  = match[3];
		} else if (match = str.match(new RegExp(patterns.days, "g"))) {
			// if multiple matches found, pick the best one
			match = match.sort(function (a, b) { return b.length - a.length; })[0];
			// check if the possible date match meets our reasonable assumptions...
				// if the match doesn't start with 'on',
			if ((match.indexOf('on') !== 0 &&
				// and if the match doesn't start with 'the' and end with a comma,
				!(match.indexOf('the') === 0 && match.indexOf(',', match.length - 1) !== -1) &&
				// and if the match isn't at the end of the overall input, then drop it.
				str.indexOf(match, str.length - match.length - 1) === -1) ||
			// But if one of those is true, make sure it passes these other checks too...
				// if this is an end date and the start date isn't an all day value,
				(!(startTime && startTime.isAllDay) && 
				// and if this match is too short to mean something,
				match.length <= 2 && 
				// and if this match could be a timestamp too,
				match.match(patterns.hoursOnly)))
				// then drop it.
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
		var now = getNow();
		if (time < now && !(time.getMonth() === now.getMonth() && time.getDate() === now.getDate()))
			time.setFullYear(time.getFullYear() + 1);
		else if (time > now && startTime) {
			var temp = new Date(time.getTime()),
				startTemp = new Date(startTime.startDate.getTime());

			// make sure we weren't too aggressive in our pushing dates to future
			temp.setFullYear(temp.getFullYear() - 1);
			startTemp.setFullYear(startTemp.getFullYear() - 1);

			// allow date ranges that extend from past to future
			if ((startTemp < now && temp > now) || 
				(startTemp < now && startTime.isAllDay && 
					temp.getMonth() === now.getMonth() && temp.getDate() === now.getDate())) {
				startTime.startDate = startTemp;
				time.setFullYear(time.getFullYear() - 1);
			}
		}

		return match[0];
	},

	helpers = {
		// convert month string to number
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
		},

		// find the nearest future date that is on the given weekday
		changeDay: function(time, newDay, hasNext) {
			var diff = 7 - time.getDay() + newDay;
			if (diff > 7 && !hasNext)
				diff -= 7;
			return time.getDate() + diff;
		},

		escapeRegExp: function(str) {
		  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		},

		// mapping of words to numbers
		wordsToInt: {
			'one': 1,
			'first': 1,
			'two': 2,
			'second': 2,
			'three': 3,
			'third': 3,
			'four': 4,
			'fourth': 4,
			'five': 5,
			'fifth': 5,
			'six': 6,
			'sixth': 6,
			'seven': 7,
			'seventh': 7,
			'eight': 8,
			'eighth': 8,
			'nine': 9,
			'ninth': 9,
			'ten': 10,
			'tenth': 10
		},

		// mapping of number to words
		intToWords: [
			'one|first',
			'two|second',
			'three|third',
			'four|fourth',
			'five|fifth',
			'six|sixth',
			'seven|seventh',
			'eight|eighth',
			'nine|ninth',
			'ten|tenth'
		],

		// converts all the words in a string into numbers, such as four -> 4
		strToNum: function(str) {
			return str.replace(patterns.digit, function(val) {
				var out = helpers.wordsToInt[val];
				if (val.indexOf('th', val.length - 2) !== -1)
					out += 'th';
				else if (val.indexOf('st', val.length - 2) !== -1)
					out += 'st';
				else if (val.indexOf('nd', val.length - 2) !== -1)
					out += 'nd';
				else if (val.indexOf('rd', val.length - 2) !== -1)
					out += 'rd';
				return out;
			});
		},

		// converts all the numbers in a string into regex for number|word, such as 4 -> 4|four
		numToStr: function(str) {
			return str.replace(/((?:[1-9]|10)(?:st|nd|rd|th)?)/g, function(val) {
				return '(?:' + val + '|' + helpers.intToWords[parseInt(val) - 1] + ')';
			});
		}
	};

	// may 5, may 5th
	patterns.monthDay = new RegExp(patterns.months + " "  + patterns.days); // add `+ patterns.year` to add year support
	// 5th may, 5 may
	patterns.dayMonth = new RegExp(patterns.days + "(?: (?:day )?of)? " + patterns.months); // add `+ patterns.year` to add year support
	// 5, 5th
	patterns.daysOnly = new RegExp(patterns.days);
	patterns.digit = new RegExp("\\b(" + helpers.intToWords.join("|") + ")\\b", "g");

	return {
		// parses a string and returns an object defining the basic event 
		// with properties: eventTitle, startDate, endDate, isAllDay
		// plus anything Watson adds on...
		parse: function(str) {
			// check for null input
			if (str === null) str = '';

			var date = getNow(),
				// Check if Watson is around. If not, pretend like he is to keep Sherlock company.
				result = (typeof Watson !== 'undefined') ? Watson.preprocess(str) : [str, {}],
				str = result[0],
				ret = result[1],
				// token the string to start and stop times
				tokens = str.toLowerCase().split(patterns.rangeSplitters);
			
			patterns.rangeSplitters.lastIndex = 0;

			// normalize all dates to 0 milliseconds
			date.setMilliseconds(0);

			while (!ret.startDate) {
				// parse the start date
				if ((result = parser(tokens[0], date, null)) !== null) {
					if (result.isAllDay)
						// set to midnight
						date.setHours(0, 0, 0);

					ret.isAllDay = result.isAllDay;
					ret.eventTitle = result.eventTitle;
					ret.startDate = result.isValidDate ? date : null;
				}

				// if no time
				if (!ret.startDate && tokens.length >= 3) {
					// join the next 2 tokens to the current one
					var tokensTmp = [tokens[0] + tokens[1] + tokens[2]];
					for (var k = 3; k < tokens.length; k++) {
						tokensTmp.push(tokens[k]);
					}
					tokens = tokensTmp;
				} else
					break;
			}

			// parse the 2nd half of the date range, if it exists
			while (!ret.endDate) {
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
				}

				if (!ret.endDate) {
					if (tokens.length >= 4) {
						// join the next 2 tokens to the current one
						var tokensTmp = [tokens[0], tokens[1], tokens[2] + tokens[3] + tokens[4]];
						for (var k = 5; k < tokens.length; k++) {
							tokensTmp.push(tokens[k]);
						}
						tokens = tokensTmp;
					} else {
						ret.endDate = null;
						break;
					}
				}
			}

			// get capitalized version of title
			if (ret.eventTitle) {
				ret.eventTitle = ret.eventTitle.replace(/(?:^| )(?:\.|!|,|;)+/g, '');
				var match = str.match(new RegExp(helpers.escapeRegExp(ret.eventTitle), "i"));
				if (match) {
					ret.eventTitle = match[0].replace(/ +/g, ' ').trim(); // replace multiple spaces
					if (ret.eventTitle == '')
						ret.eventTitle = null;
				}
			} else
				ret.eventTitle = null;

			if (typeof Watson !== 'undefined')
				Watson.postprocess(ret);
			return ret;
		},

		// Sets what time Sherlock thinks it is right now, regardless of the actual system time.
		// Useful for debugging different times. Pass a Date object to set 'now' to a time of your choosing.
		// Don't pass in anything to reset 'now' to the real time.
		_setNow: function(newDate) {
			nowDate = newDate;
		}
	};
})();
