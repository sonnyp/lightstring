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

/////////////////////////////////////////////////////////////////////////////////
//XEP-0184: Message Delivery Receipts http://xmpp.org/extensions/xep-0184.html //
/////////////////////////////////////////////////////////////////////////////////
(function () {

var ns = 'urn:xmpp:receipts';
Lightstring.plugins['receipts'] = {
  namespaces: {
    receipts: ns
  },
  // features: [ns],
  // methods: {
  //   'received': function(aOnSuccess, aOnError) {
  //   }
  // }
};
Object.defineProperties(Lightstring.Stanza.prototype, {
  'receipt': {
    get : function() {
      var receiptEl;
      for (var i = 0, length = this.el.childNodes.length; i < length; i++) {
        if (this.el.childNodes[i].namespaceURI === ns) {
          receiptEl = this.el.childNodes[i];
          break;
        }
      }
      if (!receiptEl)
        return null;

      var receipt = {name: receiptEl.localName};

      var id = receiptEl.getAttribute('id');
      if (id)
        receipt.id = id; 

      return receipt;
    },
    set: function(aProps) {
      var receipt = Lightstring.doc.createElementNS(ns, aProps.name);
      if (aProps.id)
        receipt.setAttribute('id', aProps.id);

      var receiptEl;
      for (var i = 0, length = this.el.childNodes.length; i < length; i++) {
        if (this.el.childNodes[i].namespaceURI === ns) {
          receiptEl = this.el.childNodes[i];
          break;
        }
      }
      if (receiptEl)
        this.el.removeChild(receiptEl);

      this.el.appendChild(receipt);
    },
    enumerable : true,  
    configurable : true
  },
  'request': {
    get : function() {
      var receipt = this.receipt;
      if (!receipt || (receipt.name !== 'request'))
        return null;

      return receipt;
    },
    set: function(aBool) {
      this.receipt = {name: 'request'}
      if (!this.id)
        this.id = Lightstring.id();
    },
    enumerable : true,  
    configurable : true
  },
  'received': {
    get : function() {
      var receipt = this.receipt;
      if (!receipt || (receipt.name !== 'received'))
        return null;

      return receipt;
    },
    set: function(aId) {
      this.receipt = {name: 'received', id: aId}
    },
    enumerable : true,  
    configurable : true
  },
});
Lightstring.Stanza.prototype.replyWithReceived = function(aProps) {
  var reply = this.reply(aProps);
  reply.received = this.id;

  return reply;
};

})();