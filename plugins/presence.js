'use strict';

/**
  Copyright (c) 2011, Sonny Piers <sonny at fastmail dot net>
  Copyright (c) 2012, Emmanuel Gil Peyrot <linkmauve@linkmauve.fr>

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

////////////
//Presence// http://xmpp.org/rfcs/rfc6121.html#presence
////////////
(function() {
  var legal_types = [
    'error',
    'probe',
    'subscribe',
    'subscribed',
    'unavailable',
    'unsubscribe',
    'unsubscribed'
  ];

  Lightstring.plugins['presence'] = {
    stanzas: {
      out: function(object) {
        if (object) {
          var payloads = "";
          var attributs = "";
          if (object.type && legal_types.indexOf(object.type) !== -1)
            attributs += " type='" + object.type + "'";

          if (object.to)
            attributs += " to='" + object.to + "'";

          if (object.priority)
            payloads += "<priority>" + object.priority + "</priority>";

          if (object.show)
            payloads += "<show>" + object.show + "</show>";

          if (object.status)
            payloads += "<status>" + object.status + "</status>";

          if (object.payload)
            payloads += object.payload;

          if (payloads)
            return "<presence" + attributs + ">" + payloads + "</presence>";
          else
            return "<presence" + attributs + "/>";

        } else
          return "<presence/>";
      },
    },
    methods: {
      send: function(aObject) {
        this.send(Lightstring.stanzas.presence.out(aObject));
      }
    },
  };

  Object.defineProperties(Lightstring.Stanza.prototype, {
    'show': {
      get : function() {
        return this.el.getAttribute('show');
      },
      enumerable : true,  
      configurable : true
    },
    'priority': {
      get : function() {
        return this.el.getAttribute('priority');
      },
      enumerable : true,  
      configurable : true
    },
    'status': {
      get : function() {
        return this.el.getAttribute('status');
      },
      enumerable : true,  
      configurable : true
    },
  })
})();
