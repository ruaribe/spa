let $t = $('<div/>');

$.gevent.subscribe($t, 'spa-login', function () {
  console.log('Hello!', arguments);
});

$.gevent.subscribe($t, 'spa-logout', function () {
  console.log('*Listchange', arguments);
});

let currentUser = spa.model.people.get_user();

currentUser.get_is_anon();

spa.model.chat.join();

spa.model.people.login('Fred');

let peopleDb = spa.model.people.get_db();

peopleDb().each(function (person, idx) { console.log(person.name); });

spa.model.chat.join();

//ほぼ即座にspa-listchangeイベントが発行される

peopleDb = spa.model.people.get_db();
peopleDb().each(function (person, idx) { console.log(person.name); });
