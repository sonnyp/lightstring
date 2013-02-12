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

//////
//IM//
//////
Lightstring.plugins['im'] = {
  stanzas: {
    normal: function(aTo, aSubject, aText) {
      return(
        "<message type='normal' to='" + aTo + "'>" +
          "<subject>" + aSubject + "</subject>" +
          "<body>" + aText + "</body>" +
        "</message>"
      );
    },
    chat: function(aTo, aText, aReceipt) {
      var message = new Element('message', {type: 'chat', to: aTo})
        .c('body').t(aText).up();

      if (aReceipt) {
        var receipt = new Element('request', {xmlns: 'urn:xmpp:receipts'});
        message.getChild('body').c(receipt);
        message.attr('id', Lightstring.id());
      }

      return message;
    },
  }
};
Object.defineProperties(Lightstring.Stanza.prototype, {
  'body': {
    get : function(){
      var bodyEl = this.el.querySelector('body');
      if (!bodyEl)
        return null;

      return bodyEl.textContent;
    },  
    // set : function(newValue){ bValue = newValue; },  
    enumerable : true,  
    configurable : true
  },
  'subject': {
    get : function(){
      var subjectEl = this.el.querySelector('subject');
      if (!subjectEl)
        return null;

      return subjectEl.textContent;
    },
    // set : function(newValue){ bValue = newValue; },  
    enumerable : true,  
    configurable : true
  }
});