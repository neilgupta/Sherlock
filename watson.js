/**
 * Watson - Collects data for Sherlock to analyze.
 * Copyright (c) 2014 Tabule, Inc.
 */

var Watson = (function() {
  var helpers = {

    // Place your helper functions here...

  };

  return {
    /*
     * Takes the untouched input string, returns 
     * an array with the modified input string at position 0 and a new Sherlocked object at position 1
    */
    preprocess: function(str) {
      var Sherlocked = {};

      // Manipulate str and Sherlocked here...

      return [str, Sherlocked];
    },

    /* 
     * Takes a Sherlocked object, and returns that Sherlocked object with any desired modifications.
    */
    postprocess: function(Sherlocked) {

      // Manipulate Sherlocked here...

      return Sherlocked;
    },

    /* Config vars for disabling certain features */
    config: {
      // Should Sherlock try to parse time ranges and return an endDate?
      disableRanges: false
    }
  };
})();
