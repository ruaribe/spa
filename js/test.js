let $t = $('<div/>');

$.gevent.subscribe($t, 'spa-login', function (event, user) {
  console.log('Hello!', user.name);
});


$.gevent.subscribe($t, 'spa-listchange',
  function (event, changed_list) {
    console.log('*Listchange:', changed_list);
});

spa.model.people.login('jessy');

let person = spa.model.people.get_by_cid('id_03');

JSON.stringify(person.css_map);

spa.model.chat.update_avatar({
  person_id: 'id_03', css_map: {}
});

person = spa.model.people.get_by_cid('id_03');

JSON.stringify(person.css_map);