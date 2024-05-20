FullCalendar.globalLocales.push(function () {
  'use strict';

  var et = {
    code: "et",
    week: {
      dow: 1,
      doy: 4
    },
    buttonText: {
      prev: "Eelnev",
      next: "Järgnev",
      today: "Täna",
      month: "Kuu",
      week: "Nädal",
      day: "Päev",
      list: "Päevakord"
    },
    weekText: "näd",
    allDayText: "Kogu päev",
    moreLinkText: function(n) {
      return "+ veel " + n;
    },
    noEventsText: "Kuvamiseks puuduvad sündmused"
  };

  return et;

}());
