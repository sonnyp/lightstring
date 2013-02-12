'use strict';

/**
  Copyright (c) 2011, Sonny Piers <sonny at fastmail dot net>

  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted, provided that the above
  copyright notice and this permission notice appear in all copies.

  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
  WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
  MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
  ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
  WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
  ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
  OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

//////////
//Roster//
//////////
Lightstring.plugins['roster'] = {
  namespaces: {
    roster: 'jabber:iq:roster'
  },
  stanzas: {
    'get': function(aVer) {
      return (
        '<iq type="get">' +
          '<query xmlns="' + Lightstring.ns.roster + '"' +
            //http://xmpp.org/rfcs/rfc6121.html#roster-versioning
            (typeof aVer === 'string' ? ' ver="' + aVer + '"' : '') +
          '/>' +
        '</iq>'
      );
    },
    add: function(aAddress, aGroups) {
      var iq = "<iq type='set'>" +
                 "<query xmlns='" + Lightstring.ns.roster + "'>" +
                   "<item jid='" + aAddress + "'/>" +
                 "</query>" +
               "</iq>";
      for (var i = 0; i < aGroups.length; i++) {
        if (i === 0)
          iq.querySelector('item').appendChild(document.createElement('group'));
        iq.querySelector('group').appendChild(document.createElement(aGroups[i]));
      }
      return iq;
    },
    remove: function(aAddress) {
      return "<iq type='set'>" +
               "<query xmlns='" + Lightstring.ns.roster + "'>" +
                 "<item jid='" + aAddress + "' subscription='remove'/>" +
               "</query>" +
             "</iq>";
    }
  },
  methods: {
    'get': function(aVer, aOnSuccess, aOnError) {
      this.send(Lightstring.stanzas.roster.get(aVer), function(stanza) {
        var contacts = [];
        var query = stanza.getChild('query');
        var items = query.getChildren('item');

        for (var i = 0; i < items.length; i++) {
          var item = items[i];
          var contact = {}

          var jid = item.attrs.jid;
          if (jid)
            contact.jid = jid;

          var name = item.attrs.name;
          if (name)
            contact.name = name;

          var subscription = item.attrs.subscription;
          if (subscription)
            contact.subscription = subscription;

          var ask = item.attrs.ask;
          if (ask)
            contact.ask = ask;

          var groups = item.getChildren('group');
          if(groups) {
            contact.groups = [];
            for (var y = 0; y < groups.length; y++)
              contact.groups.push(groups[y].text());
          }

          contacts.push(contact);
        }

        stanza.roster = {
          contacts: contacts
        };

        if (query.attrs.ver)
          stanza.roster.ver = query.attrs.ver;

        if (aOnSuccess)
          aOnSuccess(stanza);
      }, aOnError);
    }
  }
};
