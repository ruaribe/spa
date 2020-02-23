/*
  spa.model.js
  モデルモジュール
*/
/*jslint browser : true, continue :true,
  devel : true, indent : 2, maxerr :50,
  newcap : true, nomen : true, plusplus : true,
  regexp :true, sloppy : true, vars : false,
  white : true
*/
/*global $, spa:true */
spa.model = (function () {
  'use strict';
  let
    configMap = { anon_id: 'a0' },
    stateMap = {
      anon_user: null,
      cid_serisl: 0,
      people_cid_map: {},
      people_db: TAFFY(),
      user: null
    },
    
    isFakeData = true,
    personProto, makeCid, clearPeopleDb, completeLogin,
    makePerson, removePerson, people, initModule;
  
  // peopleオブジェクトAPI
  // ----------------------
  // peopleオブジェクトはspa.model.peopleで利用できる。
  // peopleオブジェクトはpersonオブジェクトの集合を管理するためのメソッドと
  // イベントを提供する。peopleオブジェクトのパブリックメソッドには以下が含まれる。
  //  * get user()ー現在のpeosonオブジェクトを返す。
  //    現在のユーザがサインインしていない場合には、匿名personオブジェクトを返す。
  //  * get_db()ーあらかじめソートされたすべてのpersonオブジェクト
  //    (現在のユーザを含む)のTaffyDBデータベースを返す。
  //  * get_by_cid( <client_id> )ー指定された一意のIDを持つpersonオブジェクトを返す。
  //  * login( <user_name> )ー指定のユーザ名を持つユーザとしてログインする。
  //    現在のユーザオブジェクトは新しいIDを反映するように変更される。
  //    ログインに成功すると「spa-login」グローバルカスタムイベントを発行する。
  //  * logout()ー現在のユーザオブジェクトを匿名に戻す。
  //    このメソッドは「spa-logout」グローバルカスタムイベントを発行する。
  //
  // このオブジェクトが発行するjQueryグローバルイベントには以下が含まれる。
  //  * spa-loginーユーザのログイン処理が完了したときに発行される。
  //    更新されたユーザオブジェクトをデータとして提供する。
  //  * spa-logoutーログアウトの完了時に発行される。
  //    以前のユーザオブジェクトをデータとして提供する。
  //
  // それぞれの人はpersonオブジェクトで表される。
  // personオブジェクトは以下のメソッドを提供する
  //  * get_is_user()ーオブジェクトが現在のユーザーの場合にtrueを返す。
  //  * get_is_anon()ーオブジェクトが匿名の場合にtrueを返す。
  //
  // personオブジェクトの属性には以下が含まれる。
  //  * cidークライアントID文字列。これは常に定義され、
  //    クライアントデータがバックエンドと同期していない場合のみid属性と異なる。
  //  * idー一意のID。オブジェクトがバックエンドと同期していない場合には未定義になることがある。
  //  * nameーユーザの文字列名。
  //  * css_mapーアバター表現に使う属性のマップ。
  //
  //
  personProto = {
    get_is_user: function () {
      return this.cid === stateMap.anon_user.cid;
    },
    get_is_anon: function () {
      return this.cid === stateMap.anon_user.id;
    }
  };

  makeCid = function () {
    return 'c' + String(stateMap.cid_serisl++);
  };

  clearPeopleDb = function () {
    let user = stateMap.user;
    stateMap.people_db = TAFFY();
    stateMap.people_cid_map = {};
    if (user) {
      stateMap.people_db.insert(user);
      stateMap.people_cid_map[user.cid] = user;
    }
  };

  completeLogin = function (user_list) {
    let user_map = user_list[0];
    delete stateMap.people_cid_map[user_map.cid];
    stateMap.user.cid = user_map._id;
    stateMap.user.id = user_map._id;
    stateMap.user.css_map = user_map.css_map;
    stateMap.people_cid_map[user_map._id] = stateMap.user;

    // チャットを追加するときには、ここで参加すべき
    $.gevent.publish('spa-login', [stateMap.user]);
  };

  makePerson = function (person_map) {
    let person,
      cid = person_map.cid,
      css_map = person_map.css_map,
      id = person_map.id,
      name = person_map.name;
    
    if (cid === undefined || !name) {
      throw 'client id and name required';
    }

    person = Object.create(personProto);
    person.cid = cid;
    person.name = name;
    person.css_map = css_map;
    
    if (id) { person.id = id }

    stateMap.people_cid_map[cid] = person;

    stateMap.people_db.insert(person);
    return person;
  };

  removePerson = function (person) {
    if (!person) { return false };
    // 匿名ユーザは削除できない
    if (person.id === configMap.anon_id ) {
      return false;
    }

    stateMap.people_db({ cid: person.cid }).remove();
    if (person.cid) {
      delete stateMap.people_cid_map[person.id];
    }
    return true;
  };

  people = (function () {
    let get_by_cid, get_db, get_user, login, logout;

    get_by_cid = function (cid) {
      return stateMap.people_cid_map[cid];
    }

    get_db = function () { return stateMap.people_db; };

    get_user = function () { return stateMap.user; };

    login = function (name) {
      let sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();

      stateMap.user = makePerson({
        cid: makeCid(),
        css_map: { top: 25, left: 25, 'background-color': '#8f8' },
        name: name
      });

      sio.on('userupdate', completeLogin);

      sio.emit('adduser', {
        cid: stateMap.user.cid,
        css_map: stateMap.user.css_map,
        name: stateMap.user.name
      });
    };
    
    logout = function () {
      let is_removed, user = stateMap.user;
  
      // チャットを追加するときはここでチャットルームから出るべき
  
      is_removed = removePerson();
      stateMap.user = stateMap.anon_user;
  
      $.gevent.publish('spa-logout', [user]);
      return is_removed;
    };

    return {
      get_by_cid: get_by_cid,
      get_db, get_db,
      get_user: get_user,
      login: login,
      logout: logout
    }
  }());

  initModule = function () {
    let i, people_list, person_map;

    // 匿名ユーザを初期化する
    stateMap.anon_user = makePerson({
      cid: configMap.anon_id,
      id: configMap.anon_id,
      name: 'anonymous'
    });
    stateMap.user = stateMap.anon_user;

    if (isFakeData) {
      people_list = spa.fake.getPeopleList();
      for (i = 0; i < people_list.length; i++) {
        person_map = people_list[i];
        makePerson({
          cid: person_map._id,
          css_map: person_map.css_map,
          id: person_map._id,
          name: person_map.name
        });
      }
    }
  };

  return {
    initModule: initModule,
    people: people
  }
}());