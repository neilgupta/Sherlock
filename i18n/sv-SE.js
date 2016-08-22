var sherlockOptions = {
    patterns : {
        rangeSplitters: /(\btill(?:s)?\b|\s\-\s|\bgenom\b|\boch\b|\bslutar?\b)/g,
        // okt, october
        months: "\\b(jan(?:uari)?|feb(?:ruari)?|mar(?:s)?|apr(?:il)?|maj|jun(?:i)?|jul(?:i)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\b",
        // 3, 31, 31st, fifth
        days: "\\b(?:(?:(?:på )?den )(?=\\d\\d?(?:a|e)))?([1-2]\\d|3[0-1]|0?[1-9])(?:a|e)?(?:,|\\b)",
        // 2014, 1990
        // Does not recognize 1930 for example because that could be confused with a valid time.
        // Exceptions are made for years in 21st century.
        years: "\\b(20\\d{2}|\\d{2}[6-9]\\d)\\b",

        // 13/5-2016
        shortForm: /\b(0?[1-2]\d|3[0-1]|0?[1-9])\/(0?[1-9]|1[0-2])\-?(\d{2,4})?\b/,
        shortFormStr: "(?<date>0?[1-2][0-9]|3[0-1]|0?[1-9])\\/(?<month>0?[1-9]|1[0-2])\\-(?<year>[0-9]{2,4})?",

        // tue, tues, tuesday
        weekdays: /(?:(nästa|förra|i) (?:vecka (?:på )?)?)?\b(sön|mån|tis|ons|tors|fre|lör)(?:dag(en|ar|s)?)?\b/,
        relativeDateStr: "((?:nästa|förra|på) (?:vecka|månad|år)|i ?morgon|idag|nu|i ?övermorgon|igår|i ?förrgår)",
        inRelativeDateStr: "(\\d{1,4}|en|ett) (dag|vecka|månad|år) ?(gammal|sedan)?",

        inRelativeTime: /\b(\d{1,2} ?|en |ett )(h|timme?|m(?:in(?:ut)?)?)er? ?(gammal|sedan)?\b/,
        inMilliTime: /\b(\d+) ?(s(?:ek(?:und)?)?|ms|millisecond)er? ?(gammal|sedan)?\b/,
        midtime: /(?:@ ?)?\b(?:vid )?(lunch|midnatt)\b/,
        // 23:50, 0700, 1900
        internationalTime: /\b(?:(0[0-9]|1[3-9]|2[0-3]):?([0-5]\d))\b/,
        // 5, 12pm, 5:00, 5:00pm, at 5pm, @3a
        explicitTime: /(?:@ ?)?\b(?:vid |från )?(1[0-2]|[1-9])(?::?([0-5]\d))? ?([ap]\.?m?\.?)?(?:o'clock)?\b/,

        more_than_comparator: /"((?:mer|större|senare) än|efter)/i,
        less_than_comparator: /"((?:mindre|färre|äldre) än|före)/i,

        // filler words must be preceded with a space to count
        fillerWords: / (från|är|var|på|för|i|senaste(?! datum)|(?:till)?s?)\b/,
        // less aggressive filler words regex to use when rangeSplitters are disabled
        fillerWords2: / (var|är|senaste(?! datum))\b/
    },
    helpers: {
        monthToInt: {"jan": 0, "feb": 1, "mar": 2, "apr": 3, "maj": 4, "jun": 5, "jul": 6, "aug": 7, "sep": 8, "oct": 9, "nov": 10, "dec": 11},

        // mapping of words to numbers
        wordsToInt: {
            'ett'   : 1,
            'första'   : 1,
            'två'   : 2,
            'andra'  : 2,
            'tre'   : 3,
            'tredje'   : 3,
            'fyra'    : 4,
            'fjärde'  : 4,
            'fem'    : 5,
            'femte'   : 5,
            'sex'   : 6,
            'sjätte'   : 6,
            'sju'   : 7,
            'sjunde' : 7,
            'åtta'   : 8,
            'åttonde'  : 8,
            'nio'    : 9,
            'nionde'   : 9,
            'tio'   : 10,
            'tionde'   : 10
        },

        // mapping of number to words
        intToWords: [
            'ett|första',
            'två|andra',
            'tre|tredje',
            'fyra|fjärde',
            'fem|femte',
            'sex|sjätte',
            'sju|sjunde',
            'åtta|åttonde',
            'nio|nionde',
            'tio|tionde'
        ]
    },
    cases : {
        weekDays: {'sön' : 0, 'mån' : 1, 'tis': 2, 'ons' : 3, 'tor' : 4, 'fre' : 5, 'lör': 6},
        relativeDates: {
            next_week:              'nästa vecka',
            next_month:             'nästa månad',
            next_year:              'nästa år',
            last_week:              'förra veckan',
            last_month:             'förra månaden',
            last_year:              'förra året',
            this_week:              'den här veckan',
            this_month:             'den här månaden',
            this_year:              'det här året',
            tom:                    'imorgon',
            tomorrow:               'imorgon',
            day_after_tomorrow:     'i övermorgon',
            day_after_tom:          'övermorgon',
            today:                  'idag',
            tod:                    'idag',
            now:                    'nu',
            yesterday:              'igår',
            day_before_yesterday:   'i förrgår'
        },
        scales: {
            day: 'dag',
            week: 'vecka',
            month: 'månad',
            year: 'år'
        },
        noonmidnight: {
            noon: 'lunch',
            midnight: 'midnatt'
        },
        keywords: {
            on: 'på',
            the: 'den',
            was: 'var',
            agoold: 'sedan|gammal',
            from: 'från',
            last: ['förra', 'i']
        },
        dayends: 'a|e'
    }
};