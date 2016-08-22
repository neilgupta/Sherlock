/*!
 * Sherlock
 * Copyright (c) 2014 Tabule, Inc.
 * Version 1.3.2
 */

var Sherlock = (function(options) {
  /**
   * Function to compine, override and object with another object.
   * @param object target original object that will be overwritten if matching properties exists
   * @param object source object that will overwrite target with new/updated properties
   * @returns object
   */
  var extend = function(target, source) {
        target = target || {};
        for (var prop in source) {
          if (typeof source[prop] === 'object' && !(source[prop] instanceof RegExp)) {
            target[prop] = extend(target[prop], source[prop]);
          }
          else {
            target[prop] = source[prop];
          }
        }
        return target;
      },
      patterns = { //Default patterns to match dates with

        rangeSplitters: /(\bto\b|\-|\b(?:un)?till?\b|\bthrough\b|\bthru\b|\band\b|\bends?\b)/g,

        // oct, october
        months: "\\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\b",

        // 3, 31, 31st, fifth
        days: "\\b(?:(?:(?:on )?the )(?=\\d\\d?(?:st|nd|rd|th)))?([1-2]\\d|3[0-1]|0?[1-9])(?:st|nd|rd|th)?(?:,|\\b)",

        // 2014, 1990
        // Does not recognize 1930 for example because that could be confused with a valid time.
        // Exceptions are made for years in 21st century.
        years: "\\b(20\\d{2}|\\d{2}[6-9]\\d)\\b",

        // 5/12/2014
        shortForm: /\b(0?[1-9]|1[0-2])\/([1-2]\d|3[0-1]|0?[1-9])\/?(\d{2,4})?\b/,
        shortFormStr: "(?<month>0?[1-9]|1[0-2])\\/(?<date>[1-2][0-9]|3[0-1]|0?[1-9])\\/?(?<year>[0-9]{2,4})?",

        // tue, tues, tuesday
        weekdays: /(?:(next|last) (?:week (?:on )?)?)?\b(sun|mon|tue(?:s)?|wed(?:nes)?|thurs|fri|sat(?:ur)?)(?:day)?\b/,
        relativeDateStr: "((?:next|last|this) (?:week|month|year)|tom(?:orrow)?|tod(?:ay)?|now|day after tom(?:orrow)?|yesterday|day before yesterday)",
        inRelativeDateStr: "(\\d{1,4}|a) (day|week|month|year)s? ?(ago|old)?",

        inRelativeTime: /\b(\d{1,2} ?|a |an )(h(?:our)?|m(?:in(?:ute)?)?)s? ?(ago|old)?\b/,
        inMilliTime: /\b(\d+) ?(s(?:ec(?:ond)?)?|ms|millisecond)s? ?(ago|old)?\b/,
        midtime: /(?:@ ?)?\b(?:at )?(noon|midnight)\b/,
        // 23:50, 0700, 1900
        internationalTime: /\b(?:(0[0-9]|1[3-9]|2[0-3]):?([0-5]\d))\b/,
        // 5, 12pm, 5:00, 5:00pm, at 5pm, @3a
        explicitTime: /(?:@ ?)?\b(?:at |from )?(1[0-2]|[1-9])(?::?([0-5]\d))? ?([ap]\.?m?\.?)?(?:o'clock)?\b/,

        more_than_comparator: /((?:more|greater|newer) than|after)/i,
        less_than_comparator: /((?:less|fewer|older) than|before)/i,

        // filler words must be preceded with a space to count
        fillerWords: / (from|is|was|at|on|for|in|due(?! date)|(?:un)?till?)\b/,
        // less aggressive filler words regex to use when rangeSplitters are disabled
        fillerWords2: / (was|is|due(?! date))\b/
      },
      cases = {
        weekDays: {'sun' : 0, 'mon' : 1, 'tue' : 2, 'wed' : 3, 'thu' : 4, 'fri': 5, 'sat': 6},
        relativeDates: {
          next_week:              'next week',
          next_month:             'next month',
          next_year:              'next year',
          last_week:              'last week',
          last_month:             'last month',
          last_year:              'last year',
          this_week:              'this week',
          this_month:             'this month',
          this_year:              'this year',
          tom:                    'tom',
          tomorrow:               'tomorrow',
          day_after_tomorrow:     'day after tomorrow',
          day_after_tom:          'day after tom',
          today:                  'today',
          tod:                    'tod',
          now:                    'now',
          yesterday:              'yesterday',
          day_before_yesterday:   'day before yesterday'
        },
        scales: {
          day: 'day',
          week: 'week',
          month: 'month',
          year: 'year'
        },
        noonmidnight: {
          noon: 'noon',
          midnight: 'midnight'
        },
        keywords: {
          on: 'on',
          the: 'the',
          was: 'was',
          agoold: 'ago|old',
          from: 'from',
          last: ['last'],
          dayofreg: "(?: (?:day )?of)? ",
          titlereplacereg: /(?:^| )(?:\.|-$|by$|in$|at$|from$|on$|starts?$|for$|(?:un)?till?$|!|,|;)+/g
        },
        dayends: 'th|rd|nd|st'
      },
      nowDate = null,
      matchedOnMonthOnly = false, //Bool to show if we only matched the month
      getNow = function() {
        if (nowDate) {
          return new Date(nowDate.getTime());
        }
        else {
          return new Date();
        }
      },

      readConfig = function(config_var) {
        return (typeof Watson !== 'undefined' && Watson.config) ? Watson.config[config_var] : null;
      },

      parser = function(str, time, startTime) {
        var ret = {},
            dateMatch = false,
            timeMatch = false,
            strNummed = helpers.strToNum(str);

        // parse date
        if(dateMatch = matchDate(strNummed, time, startTime)) {
          strNummed = strNummed.replace(new RegExp(dateMatch), '');
          str = str.replace(new RegExp(helpers.numToStr(dateMatch)), '');
        }
        else { //fallback to legacy date
          var legacyDateMatch = Date.parse(strNummed);
          if(!isNaN(legacyDateMatch)) {
            var rTime = new Date(legacyDateMatch);
            time.setFullYear(rTime.getFullYear(),rTime.getMonth(), rTime.getDate());
            str = str.replace(strNummed, '');
          }
        }

        // parse time
        if(timeMatch = matchTime(strNummed, time, startTime)) {
          str = str.replace(new RegExp(helpers.numToStr(timeMatch)), '');
        }

        ret.eventTitle = str;

        // if time data not given, then this is an all day event
        ret.isAllDay = !!(dateMatch && !timeMatch && dateMatch !== "now");

        // check if date was parsed
        ret.isValidDate = !!(dateMatch || timeMatch);

        return ret;
      },

      matchTime = function(str, time, startTime) {
        var match,
            matchConfidence = 0,
            matchedString = false,
            matchedHour,
            matchedMin,
            matchedHasMeridian;

        if (match = str.match(new RegExp(patterns.explicitTime.source, "g"))) {
          // if multiple matches found, pick the best one
          match = match.sort(function (a, b) {
            var aScore = a.trim().length,
                bScore = b.trim().length;
            // Weight matches that include full meridian
            if (a.match(/(?:a|p).?m.?/)) {
              aScore += 20;
            }
            if (b.match(/(?:a|p).?m.?/)) {
              bScore += 20;
            }
            return bScore - aScore;
          })[0].trim();

          if (match.length <= 2 && str.trim().length > 2) {
            matchConfidence = 0;
          }
          else {
            matchConfidence = match.length;
            match = match.match(patterns.explicitTime);

            var hour = parseInt(match[1]),
                min = match[2] || 0,
                meridian = match[3];

            if (meridian) {
              // meridian is included, adjust hours accordingly
              if (meridian.indexOf('p') === 0 && hour != 12)
                hour += 12;
              else if (meridian.indexOf('a') === 0 && hour == 12)
                hour = 0;
              matchConfidence += 20;
            }
            else if (hour < 12 && (hour < 7 || hour < time.getHours())) {
              // meridian is not included, adjust any ambiguous times
              // if you type 3, it will default to 3pm
              // if you type 11 at 5am, it will default to am,
              // but if you type it at 2pm, it will default to pm
              hour += 12;
            }

            matchedHour = hour;
            matchedMin = min;
            matchedHasMeridian = !!meridian;
            matchedString = match[0];
          }
        }

        var useLowConfidenceMatchedTime = function() {
          if (matchedString) {
            time.setHours(matchedHour, matchedMin, 0);
            time.hasMeridian = matchedHasMeridian;
          }
          return matchedString;
        };

        if (matchConfidence < 4) {
          if (match = str.match(patterns.inRelativeTime)) {
            // if we matched 'a' or 'an', set the number to 1
            if (isNaN(match[1])) {
              match[1] = 1;
            }

            if (match[3]) {
              match[1] = parseInt(match[1])*-1;
            }

            switch(match[2].substring(0, 1)) {
              case "h":
                time.setHours(time.getHours() + parseInt(match[1]));
                return match[0];
              case "m":
                time.setMinutes(time.getMinutes() + parseInt(match[1]));
                return match[0];
              default:
                return useLowConfidenceMatchedTime();
            }
          }
          else if (match = str.match(patterns.inMilliTime)) {
            if (match[3])
              match[1] = parseInt(match[1])*-1;

            switch(match[2].substring(0, 1)) {
              case "s":
                time.setSeconds(time.getSeconds() + parseInt(match[1]));
                return match[0];
              case "m":
                time.setMilliseconds(time.getMilliseconds() + parseInt(match[1]));
                return match[0];
              default:
                return useLowConfidenceMatchedTime();
            }
          }
          else if (match = str.match(patterns.midtime)) {
            switch(match[1]) {
              case cases.noonmidnight.noon:
                time.setHours(12, 0, 0);
                time.hasMeridian = true;
                return match[0];
              case cases.noonmidnight.midnight:
                time.setHours(0, 0, 0);
                time.hasMeridian = true;
                return match[0];
              default:
                return useLowConfidenceMatchedTime();
            }
          }
          else if (match = str.match(patterns.internationalTime)) {
            time.setHours(match[1], match[2], 0);
            time.hasMeridian = true;
            return match[0];
          }
          else {
            return useLowConfidenceMatchedTime();
          }

        }
        else {
          return useLowConfidenceMatchedTime();
        }

      },

      matchDate = function(str, time, startTime) {
        var match;
        matchedOnMonthOnly = false;
        if (match = str.match(patterns.monthDay)) {
          if (match[3]) {
            time.setFullYear(match[3], helpers.changeMonth(match[1]), match[2]);
            time.hasYear = true;
          }
          else {
            time.setMonth(helpers.changeMonth(match[1]), match[2]);
          }

          return match[0];
        }
        else if (match = str.match(patterns.dayMonth)) {
          if (match[3]) {
            time.setFullYear(match[3], helpers.changeMonth(match[2]), match[1]);
            time.hasYear = true;
          }
          else {
            time.setMonth(helpers.changeMonth(match[2]), match[1]);
          }
          return match[0];
        }
        else if(match = str.match(patterns.month)) {
          //only month here
          time.setMonth(helpers.changeMonth(match[1]));
          time.setDate(1);
          matchedOnMonthOnly = true;
          return match[0];
        }
        else if(match = str.match(patterns.shortForm)) {
          if(typeof XRegExp !== 'undefined') {//Make check for XRegExp
            match = XRegExp.exec(str, patterns.shortForm);// here we should have named matches
            var yearStr = match.year, year = null;

            if (yearStr) {
              year = parseInt(yearStr);
            }
            if (year && yearStr.length < 4) {
              // if only 2 digits are given, assume years above 50 are in the 20th century, otherwise 21st century
              year += year > 50 ? 1900 : 2000;
            }
            if (year) {
              time.setFullYear(year, parseInt(match.month, 10) - 1, match.date);
              time.hasYear = true;
            }
            else {
              time.setMonth(parseInt(match.month, 10) - 1, match.date);
            }
            return match[0];
          }
          else {
            var yearStr = match[3], year = null;
            if (yearStr)
              year = parseInt(yearStr);
            if (year && yearStr.length < 4)
            // if only 2 digits are given, assume years above 50 are in the 20th century, otherwise 21st century
              year += year > 50 ? 1900 : 2000;
            if (year) {
              time.setFullYear(year, match[1] - 1, match[2]);
              time.hasYear = true;
            }
            else
              time.setMonth(match[1] - 1, match[2]);
            return match[0];
          }
        }
        else if (match = str.match(patterns.weekdays)) {
          var comp = match[2].substr(0, 3);
          if(match[3] === 's') {
            //It's in the past, but not more then a week ago.
            var lastDay = (time.getDate() - 7) + Math.abs(time.getDay() - 6),
                p = new Date();

            p.setDate(lastDay);
          }
          if(typeof cases.weekDays[comp] !== 'undefined') {
            helpers.changeDay(time, cases.weekDays[comp], match[1]);
            return match[0];
          }

          return false;
        }
        else if (match = str.match(patterns.inRelativeDateFromRelativeDate)) {
          if (helpers.relativeDateMatcher(match[4], time) && helpers.inRelativeDateMatcher(match[1], match[2], match[3], time)) {
            return match[0];
          }
          else {
            return false;
          }
        }
        else if (match = str.match(patterns.relativeDate)) {
          if (helpers.relativeDateMatcher(match[1], time)) {
            return match[0];
          }
          else {
            return false;
          }
        }
        else if (match = str.match(patterns.inRelativeDate)) {
          if (helpers.inRelativeDateMatcher(match[1], match[2], match[3], time)) {
            return match[0];
          }
          else {
            return false;
          }

        }
        else if (match = str.match(new RegExp(patterns.days, "g"))) {
          // if multiple matches found, pick the best one
          match = match.sort(function (a, b) { return b.trim().length - a.trim().length; })[0].trim();
          // check if the possible date match meets our reasonable assumptions...
          // if the match doesn't start with 'on',
          if ((match.indexOf(cases.keywords.on) !== 0 &&
              // and if the match doesn't start with 'the' and end with a comma,
              !(match.indexOf(cases.keywords.the) === 0 && match.indexOf(',', match.length - 1) !== -1) &&
              // and if the match isn't at the end of the overall input, then drop it.
              str.indexOf(match, str.length - match.length - 1) === -1) ||
              // But if one of those is true, make sure it passes these other checks too...
              // if this is an end date and the start date isn't an all day value,
              (!(startTime && startTime.isAllDay) &&
              // and if this match is too short to mean something,
              match.length <= 2)) {
            return false;
          }
          // then drop it.

          match = match.match(patterns.daysOnly);

          var month = time.getMonth(),
              day = match[1];

          // if this date is in the past, move it to next month
          if (day < time.getDate()) {
            month++;
          }
          time.setMonth(month, day);
          return match[0];
        }
        else {
          return false;
        }

      },

  // Make some intelligent assumptions of what was meant, even when given incomplete information
      makeAdjustments = function(start, end, isAllDay, str, ret) {
        var now = getNow(),
            compStr = new RegExp("(" + cases.keywords.agoold + ")", "i");

        if (end) {
          if (start > end && end > now && helpers.isSameDay(start, end) && helpers.isSameDay(start, now)) {
            if (start.hasMeridian) {
              // we explicitly set the meridian, so don't mess with the hours
              start.setDate(start.getDate() - 1);
            }
            else {
              // we are dealing with a time range that is today with start > end
              // (ie. 9pm - 5pm when we want 9am - 5pm), roll back 12 hours.
              start.setHours(start.getHours() - 12);
              // if start is still higher than end, that means we probably have
              // 9am - 5am, so roll back another 12 hours to get 9pm yesterday - 5am today
              if (start > end) {
                start.setHours(start.getHours() - 12);
              }
            }
          }

          else if (start > end) {
            end.setDate(start.getDate() + 1);
          }

          else if (end < now && str.indexOf(" " + cases.keywords.was + " ") === -1 && helpers.monthDiff(end, now) >= 3 && !end.hasYear && !start.hasYear) {
            end.setFullYear(end.getFullYear() + 1);
            start.setFullYear(start.getFullYear() + 1);
          }

        }
        else if (start) {
          if (start < now && helpers.monthDiff(start, now) >= 3 && !start.hasYear && str.indexOf(" " + cases.keywords.was + " ") === -1) {
            start.setFullYear(start.getFullYear() + 1);
          }

          // check for open ranges (more than...)
          else if (ret.eventTitle.match(patterns.more_than_comparator)) {
            // if "ago" is used and matched (not showing in title), then we need to invert the more than comparator

            if (str.match(compStr) && ret.eventTitle.match(compStr) === null) {
              ret.endDate = new Date(start.getTime());
              ret.startDate = new Date(1900, 0, 1, 0, 0, 0, 0);
            }
            else {
              ret.endDate = new Date(3000, 0, 1, 0, 0, 0, 0);
            }
            ret.eventTitle = ret.eventTitle.replace(patterns.more_than_comparator, '');
          }

          // check for open ranges (less than...)
          else if (ret.eventTitle.match(patterns.less_than_comparator)) {
            // if "ago" is used and matched (not showing in title), then we need to invert the less than comparator
            if (str.match(compStr) && ret.eventTitle.match(compStr) === null) {
              ret.endDate = new Date(3000, 0, 1, 0, 0, 0, 0);
            }
            else {
              ret.endDate = new Date(start.getTime());
              ret.startDate = new Date(1900, 0, 1, 0, 0, 0, 0);
            }
            ret.eventTitle = ret.eventTitle.replace(patterns.less_than_comparator, '');
          }
        }
      },

      helpers = {
        relativeDateMatcher: function(match, time) {
          var now = getNow();
          switch(match) {
            case cases.relativeDates.next_week:
              time.setFullYear(now.getFullYear(), now.getMonth(), now.getDate() + 7);
              time.hasYear = true;
              return true;
            case cases.relativeDates.next_month:
              time.setFullYear(now.getFullYear(), now.getMonth() + 1, now.getDate());
              time.hasYear = true;
              return true;
            case cases.relativeDates.next_year:
              time.setFullYear(now.getFullYear() + 1, now.getMonth(), now.getDate());
              time.hasYear = true;
              return true;
            case cases.relativeDates.last_week:
              time.setFullYear(now.getFullYear(), now.getMonth(), now.getDate() - 7);
              time.hasYear = true;
              return true;
            case cases.relativeDates.last_month:
              time.setFullYear(now.getFullYear(), now.getMonth() - 1, now.getDate());
              time.hasYear = true;
              return true;
            case cases.relativeDates.last_year:
              time.setFullYear(now.getFullYear() - 1, now.getMonth(), now.getDate());
              time.hasYear = true;
              return true;
            case cases.relativeDates.this_week: // this week|month|year is pretty meaningless, but let's include it so that it parses as today
              time.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
              time.hasYear = true;
              return true;
            case cases.relativeDates.this_month:
              time.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
              time.hasYear = true;
              return true;
            case cases.relativeDates.this_year:
              time.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
              time.hasYear = true;
              return true;
            case cases.relativeDates.tom:
              time.setFullYear(now.getFullYear(), now.getMonth(), now.getDate() + 1);
              time.hasYear = true;
              return true;
            case cases.relativeDates.tomorrow:
              time.setFullYear(now.getFullYear(), now.getMonth(), now.getDate() + 1);
              time.hasYear = true;
              return true;
            case cases.relativeDates.day_after_tomorrow:
              time.setFullYear(now.getFullYear(), now.getMonth(), now.getDate() + 2);
              time.hasYear = true;
              return true;
            case cases.relativeDates.day_after_tom:
              time.setFullYear(now.getFullYear(), now.getMonth(), now.getDate() + 2);
              time.hasYear = true;
              return true;
            case cases.relativeDates.today:
              time.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
              time.hasYear = true;
              return true;
            case cases.relativeDates.tod:
              time.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
              time.hasYear = true;
              return true;
            case cases.relativeDates.now:
              time.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
              time.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
              time.hasMeridian = true;
              time.hasYear = true;
              return true;
            case cases.relativeDates.yesterday:
              time.setFullYear(now.getFullYear(), now.getMonth(), now.getDate() - 1);
              time.hasYear = true;
              return true;
            case cases.relativeDates.day_before_yesterday:
              time.setFullYear(now.getFullYear(), now.getMonth(), now.getDate() - 2);
              time.hasYear = true;
              return true;
            default:
              return false;
          }
        },

        inRelativeDateMatcher: function(num, scale, ago, time) {
          // if we matched 'a' or 'an', set the number to 1
          if (isNaN(num)) {
            num = 1;
          }
          else {
            num = parseInt(num);
          }

          if (ago) {
            num = num*-1;
          }

          switch(scale) {
            case cases.scales.day:
              time.setDate(time.getDate() + num);
              time.hasYear = true;
              return true;
            case cases.scales.week:
              time.setDate(time.getDate() + num*7);
              time.hasYear = true;
              return true;
            case cases.scales.month:
              time.setMonth(time.getMonth() + num);
              time.hasYear = true;
              return true;
            case cases.scales.year:
              time.setFullYear(time.getFullYear() + num);
              time.hasYear = true;
              return true;
            default:
              return false;
          }
        },

        // convert month string to number
        changeMonth: function(month) {
          return this.monthToInt[month.substr(0, 3)];
        },

        // find the nearest future date that is on the given weekday
        changeDay: function(time, newDay, hasNext) {
          var diff = 7 - time.getDay() + newDay;
          if (diff > 7 && hasNext === undefined) {
            diff -= 7;
          }
          if (cases.keywords.last.indexOf(hasNext) > -1) {
            diff = diff*-1;
          }

          time.setDate(time.getDate() + diff);
        },

        monthDiff: function(d1, d2) {
          var months;

          months = (d2.getFullYear() - d1.getFullYear()) * 12;
          months -= d1.getMonth() + 1;
          months += d2.getMonth() + 1;
          return months <= 0 ? 0 : months;
        },

        escapeRegExp: function(str) {
          return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        },

        isSameDay: function(date1, date2) {
          return date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate() && date1.getFullYear() === date2.getFullYear();
        },

        monthToInt: {"jan": 0, "feb": 1, "mar": 2, "apr": 3, "may": 4, "jun": 5, "jul": 6, "aug": 7, "sep": 8, "oct": 9, "nov": 10, "dec": 11},

        // mapping of words to numbers
        wordsToInt: {
          'one'   : 1,
          'first'   : 1,
          'two'   : 2,
          'second'  : 2,
          'three'   : 3,
          'third'   : 3,
          'four'    : 4,
          'fourth'  : 4,
          'five'    : 5,
          'fifth'   : 5,
          'six'   : 6,
          'sixth'   : 6,
          'seven'   : 7,
          'seventh' : 7,
          'eight'   : 8,
          'eighth'  : 8,
          'nine'    : 9,
          'ninth'   : 9,
          'ten'   : 10,
          'tenth'   : 10
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
          var i,
              l,
              p = str.replace(patterns.digit, function(val) {
                var out = helpers.wordsToInt[val],
                    dayEnds = cases.dayends.split('|');

                for(i = 0,l = dayEnds.length;i < l;i++) {
                  if (val.indexOf(dayEnds[i], val.length - 2) !== -1) {
                    out += dayEnds[i];
                    break;
                  }
                }
                return out;
              });

          return p;
        },

        // converts all the numbers in a string into regex for number|word, such as 4 -> 4|four
        numToStr: function(str) {
          var regExp = new RegExp('((?:[1-9]|10)(?:' + cases.dayends + ')?)','g');
          return str.replace(regExp, function(val) {
            return '(?:' + val + '|' + helpers.intToWords[parseInt(val) - 1] + ')';
          });
        }
      };


  if(typeof options !== 'undefined') {
    patterns = typeof options.patterns !== 'undefined' ?  extend(patterns, options.patterns) : patterns;
    helpers = typeof options.helpers !== 'undefined' ? extend(helpers, options.helpers) : helpers;
    cases = typeof options.cases !== 'undefined' ? extend(cases, options.cases) : cases;
  }

  // may, june
  patterns.month = new RegExp(patterns.months);
  // may 5, may 5th
  patterns.monthDay = new RegExp(patterns.months + " "  + patterns.days + "(?: " + patterns.years + ")?");
  // 5th may, 5 may
  patterns.dayMonth = new RegExp(patterns.days + cases.keywords.dayofreg  + patterns.months + "(?: " + patterns.years + ")?");
  // 5, 5th
  patterns.daysOnly = new RegExp(patterns.days);
  patterns.digit = new RegExp("\\b(" + helpers.intToWords.join("|") + ")\\b", "g");
  // today, tomorrow, day after tomorrow
  patterns.relativeDate = new RegExp("\\b" + patterns.relativeDateStr + "\\b");
  // in 2 weeks
  patterns.inRelativeDate = new RegExp("\\b" + patterns.inRelativeDateStr + "\\b");
  // 2 weeks from tomorrow
  patterns.inRelativeDateFromRelativeDate = new RegExp("\\b" + patterns.inRelativeDateStr + " " + cases.keywords.from + " " + patterns.relativeDateStr + "\\b");

  if(typeof XRegExp !== 'undefined') {
    patterns.shortForm = XRegExp(patterns.shortFormStr, 'xi');
  }


  if(!String.prototype.trim) {
    String.prototype.trim = function () {
      return this.replace(/^\s+|\s+$/g,'');
    };
  }


  return {
    pat : function() {return {t : this, patterns: patterns, cases : cases, helpers: helpers };},
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
          tokens = readConfig("disableRanges") ? [str.toLowerCase()] : str.toLowerCase().split(patterns.rangeSplitters);

      patterns.rangeSplitters.lastIndex = 0;

      var k;

      // normalize all dates to 0 milliseconds
      date.setMilliseconds(0);

      while (!ret.startDate) {
        // parse the start date
        if ((result = parser(tokens[0], date, null)) !== null) {
          if (result.isAllDay) {
            // set to midnight
            date.setHours(0, 0, 0);
          }

          ret.isAllDay = result.isAllDay;
          ret.eventTitle = result.eventTitle;
          ret.startDate = result.isValidDate ? date : null;
          ret.hasParsedDay = result.parsedDay;
        }

        // if no time
        if (!ret.startDate && tokens.length >= 3) {
          // join the next 2 tokens to the current one
          var tokensTmp = [tokens[0] + tokens[1] + tokens[2]];
          for (k = 3; k < tokens.length; k++) {
            tokensTmp.push(tokens[k]);
          }
          tokens = tokensTmp;
        }
        else {
          break;
        }

      }

      // parse the 2nd half of the date range, if it exists
      while (!ret.endDate) {
        if (tokens.length > 1) {
          date = new Date(date.getTime());
          // parse the end date
          if ((result = parser(tokens[2], date, ret)) !== null) {
            if (ret.isAllDay) {
              // set to midnight
              date.setHours(0, 0, 0);
            }

            if (result.eventTitle.length > ret.eventTitle.length) {
              ret.eventTitle = result.eventTitle;
            }

            ret.endDate = result.isValidDate ? date : null;
          }
        }

        if (!ret.endDate) {
          if (tokens.length >= 4) {
            // join the next 2 tokens to the current one
            var tokensTmp = [tokens[0], tokens[1], tokens[2] + tokens[3] + tokens[4]];
            for (k = 5; k < tokens.length; k++) {
              tokensTmp.push(tokens[k]);
            }
            tokens = tokensTmp;
          }
          else {
            ret.endDate = null;
            break;
          }
        }
      }

      makeAdjustments(ret.startDate, ret.endDate, ret.isAllDay, str, ret);

      // get capitalized version of title
      if (ret.eventTitle) {
        var fillerWords = readConfig("disableRanges") ? patterns.fillerWords2 : patterns.fillerWords;
        ret.eventTitle = ret.eventTitle.split(fillerWords)[0].trim();
        ret.eventTitle = ret.eventTitle.replace(cases.keywords.titlereplacereg, '').replace(/ +/g, ' ').trim();
        var match = str.match(new RegExp(helpers.escapeRegExp(ret.eventTitle), "i"));
        if (match) {
          ret.eventTitle = match[0].replace(/ +/g, ' ').trim(); // replace multiple spaces
          if (ret.eventTitle == '')
            ret.eventTitle = null;
        }
      } else
        ret.eventTitle = null;

      if (typeof Watson !== 'undefined') {
        Watson.postprocess(ret);
      }

      ret.matchedOnMonthOnly = matchedOnMonthOnly;
      return ret;
    },

    // Sets what time Sherlock thinks it is right now, regardless of the actual system time.
    // Useful for debugging different times. Pass a Date object to set 'now' to a time of your choosing.
    // Don't pass in anything to reset 'now' to the real time.
    _setNow: function(newDate) {
      nowDate = newDate;
    }
  };
}(typeof sherlockOptions !== 'undefined' ? sherlockOptions : {}));

// Add AMD compatibility.
if (typeof define === 'function' && define.amd) {
  define(Sherlock);
}
// Add CommonJS compatibility.
else if (typeof module !== 'undefined' && module.exports) {
  module.exports = Sherlock;
}