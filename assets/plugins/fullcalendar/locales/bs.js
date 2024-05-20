FullCalendar.globalLocales.push(function () {
  'use strict';

  var bs = {
    code: "bs",
    week: {
      dow: 1,
      doy: 7
    },
    buttonText: {
      prev: "Prošli",
      next: "Sljedeći",
      today: "Danas",
      month: "Mjesec",
      week: "Sedmica",
      day: "Dan",
      list: "Raspored"
    },
    weekText: "Sed",
    allDayText: "Cijeli dan",
    moreLinkText: function(n) {
      return "+ još " + n;
    },
    noEventsText: "Nema događaja za prikazivanje"
  };

  return bs;

}());
