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
Lightstring.NS.roster = 'jabber:iq:roster';
Lightstring.stanza.roster = {
  'get': function() {
    return "<iq type='get'><query xmlns='"+Lightstring.NS.roster+"'/></iq>";
  },
  add: function(aAddress, aGroups, aCustomName) {
    var iq = $iq({type: 'set'}).c('query', {xmlns: Lightstring.NS.roster}).c('item', {jid: aAddress}).tree();
    if(aCustomName) iq.querySelector('item').setAttribute(aCustomName);
    for (var i=0; i<aGroups.length; i++) {
      if(i === 0) iq.querySelector('item').appendChild(document.createElement('group'));
      iq.querySelector('group').appendChild(document.createElement(aGroups[i]));
    }
    return iq;
  },
  remove: function(aAddress) {
    return $iq({type: 'set'}).c('query', {xmlns: Lightstring.NS.roster}).c('item', {jid: aAddress, subscription: 'remove'}).tree();
  }
};
Lightstring.getRoster = function(connection, aCallback) {
  connection.send(this.stanza.roster.get(), function(stanza){
    var contacts = [];
    var elems = stanza.DOM.querySelectorAll('item');
    for(var i = 0; i<elms.length; i++) {
      var item = elms[i];
      var jid = item.getAttribute('jid');
      var name = item.getAttribute('name');
      var groups = item.querySelectorAll('group');
      var subscription = item.getAttribute('subscription');
      var contact = {};
      if(name)
        contact.name = name;
      if(jid)
        contact.jid = jid;
      if(subscription)
        contact.subscription = subscription;
      if(groups.length > 0) {
        contact.groups = [];
        groups.forEach(function(group) {
          contact.groups.push(group.textContent);
        });
      }

      contacts.push(contact);
    };
    aCallback(contacts);
  });
}
