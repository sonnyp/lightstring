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
Lightstring.NS.vcard = 'vcard-temp';
Lightstring.stanza.vcard = {
  'get': function(aTo) {
    if(aTo)
      return "<iq type='get' to='"+aTo+"'><vCard xmlns='"+Lightstring.NS.vcard+"'/></iq>";
    else
      return "<iq type='get'><vCard xmlns='"+Lightstring.NS.vcard+"'/></iq>";
  }
};
//FIXME we should return a proper vcard, not an XMPP one
Lightstring.getVcard = function(aConnection, aTo, aCallback) {
  aConnection.send(Lightstring.stanza.vcard.get(aTo), function(stanza, err){
    if(stanza) {
      var vcard = stanza.DOM.querySelector('vCard');
      if(vcard)
        aCallback(vcard);
    }    
    else
      aCallback(null);
  });
}
