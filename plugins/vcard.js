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

/////////
//vCard//
/////////
Lightstring.plugins['vcard'] = {
  namespaces: {
    vcard: 'vcard-temp'
  },
  stanzas: {
    get: function(aTo) {
      if (aTo)
        return "<iq type='get' to='" + aTo + "'><vCard xmlns='" +
          Lightstring.ns.vcard + "'/></iq>";
      else
        return "<iq type='get'><vCard xmlns='" + Lightstring.ns.vcard + "'/></iq>";
    },
    set: function(aFields) {
      var iq = "<iq type='set'><vCard xmlns='" +  Lightstring.ns.vcard + "'>";
      aFields.forEach(function(field) {
        iq += field;
      });
      iq += "</vCard></iq>";
      return iq;
    }
  },
  methods: {
    //FIXME: we should return a JSON vcard, not an XML one
    get: function(aTo, aOnSuccess, aOnError) {
      this.send(Lightstring.stanzas['vcard'].get(aTo),
        // on success
        function(stanza) {
          var fields = stanza.DOM.firstChild;
          if (aOnSuccess && fields)
            aOnSuccess(fields);
        },
        //on error
        function(stanza) {
          if (aOnError)
            aOnError(sanza);
        }
      );
    },
    set: function(aFields, aOnSuccess, aOnError) {
      this.send(Lightstring.stanzas['vcard'].set(aFields),
        //on success
        function(stanza) {
          if (aOnSuccess)
            aOnSuccess(stanza.DOM.firstChild);
        },
        //on error
        function(stanza) {
          if (aOnError)
            aOnError(stanza);
        }
      );
    }
  }
};
