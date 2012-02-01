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
    get: function() {
      return "<iq type='get'>" +
               "<query xmlns='" + Lightstring.NS.roster + "'/>" +
             "</iq>";
    },
    add: function(aAddress, aGroups) {
      var iq = "<iq type='set'>" +
                 "<query xmlns='" + Lightstring.NS.roster + "'>" +
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
               "<query xmlns='" + Lightstring.NS.roster + "'>" +
                 "<item jid='" + aAddress + "' subscription='remove'/>" +
               "</query>" +
             "</iq>";
    }
  },
  methods: {
    get: function(aResult, aError) {
      this.send(this.stanza.roster.get(), function(stanza) {
        var contacts = [];

        var children = stanza.DOM.firstChild.childNodes;
        var length = children.length;

        for (var i = 0; i < length; i++) {
          var item = children[i];
          var jid = item.getAttributeNS(null, 'jid');
          var name = item.getAttributeNS(null, 'name');
          var subscription = item.getAttributeNS(null, 'subscription');
          var groups = item.children;
          var contact = {};
          if (name)
            contact.name = name;
          if (jid)
            contact.jid = jid;
          if (subscription)
            contact.subscription = subscription;
          if (groups.length > 0) {
            contact.groups = [];
            groups.forEach(function(group) {
              contact.groups.push(group.textContent);
            });
          }

          contacts.push(contact);
        }

        if (aResult)
          aResult(contacts);
      }, aError);
    }
  }
};
