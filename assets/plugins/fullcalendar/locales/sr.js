FullCalendar.globalLocales.push(function () {
  'use strict';

  var sr = {
    code: "sr",
    week: {
      dow: 1,
      doy: 7
    },
    buttonText: {
      prev: "Prethodna",
      next: "Sledeći",
      today: "Danas",
      month: "Mеsеc",
      week: "Nеdеlja",
      day: "Dan",
      list: "Planеr"
    },
    weekText: "Sed",
    allDayText: "Cеo dan",
    moreLinkText: function(n) {
      return "+ još " + n;
    },
    noEventsText: "Nеma događaja za prikaz"
  };

  return sr;

}());
