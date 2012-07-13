'use strict';

/**
  Copyright (c) 2012, Sonny Piers <sonny at fastmail dot net>

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

/*
References:
  http://xmpp.org/extensions/xep-0199.html
*/

Lightstring.plugins['ping'] = {
  namespaces: {
    ping: 'urn:xmpp:ping'
  },
  stanzas: {
    ping: function (aTo){
      return(
        "<iq to='" + aTo + "' type='get'>" +
          "<ping xmlns='" + Lightstring.ns.ping + "'/>" +
        "</iq>"
      );
    },
    pong: function (aTo){
      return "<iq to='" + aTo + "' type='result'/>"
    },
  },
  handlers: {
    'iq': function (stanza) {
      if (stanza.el.firstChild.localName !== 'ping')
        return;

      var id = stanza.el.getAttribute('id');
      var from = stanza.el.getAttribute('from');
      var stanza = Lightstring.stanzas.pong(from);
      stanza.setAttribute('id', id);
    }
  }
}
Object.defineProperties(Lightstring.Stanza.prototype, {
  'ping': {
    get : function() {
      return !!(this.el.querySelector('ping'));
    },
    set: function(aBool) {
      if (this.ping)
        return;

      var pingEl = Lightstring.doc.createElementNS(Lightstring.ns.ping, 'ping');
      this.el.appendChild(pingEl);
    },
    enumerable : true,  
    configurable : true
  },
});
