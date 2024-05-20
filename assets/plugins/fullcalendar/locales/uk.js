FullCalendar.globalLocales.push(function () {
  'use strict';

  var uk = {
    code: "uk",
    week: {
      dow: 1,
      doy: 7
    },
    buttonText: {
      prev: "Попередній",
      next: "далі",
      today: "Сьогодні",
      month: "Місяць",
      week: "Тиждень",
      day: "День",
      list: "Порядок денний"
    },
    weekText: "Тиж",
    allDayText: "Увесь день",
    moreLinkText: function(n) {
      return "+ще " + n + "...";
    },
    noEventsText: "Немає подій для відображення"
  };

  return uk;

}());
