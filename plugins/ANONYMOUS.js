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
  Extensible Messaging and Presence Protocol (XMPP): Core - SASL Negotiation
      http://xmpp.org/rfcs/rfc6120.html#sasl
  Simple Authentication and Security Layer (SASL)
      http://tools.ietf.org/html/rfc4422
  Anonymous Simple Authentication and Security Layer (SASL) Mechanism
      http://tools.ietf.org/html/rfc4505
  Best Practices for Use of SASL ANONYMOUS
      http://xmpp.org/extensions/xep-0175.html
*/

Lightstring.plugins['ANONYMOUS'] = {
  handlers: {
    'mechanisms': function (stanza) {
      if(stanza.mechanisms.indexOf('ANONYMOUS') === -1)
        return;

      this.send(
        "<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl'" +
             " mechanism='ANONYMOUS'/>"
      );
    },
    'success': function (stanza) {
      this.send(
        "<stream:stream to='" + this.jid.domain + "'" +
                      " xmlns='jabber:client'" +
                      " xmlns:stream='http://etherx.jabber.org/streams'" +
                      " version='1.0'/>"
      );
    },
    'features': function (stanza) {
      var Conn = this;
      //TODO check if bind supported
      var bind =
        "<iq type='set' id='"+Lightstring.newId('sendiq:')+"'>" +
          "<bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'/>" +
        "</iq>";

      this.send(
        bind,
        //Success
        function(stanza) {
          //Session http://xmpp.org/rfcs/rfc3921.html#session
          Conn.jid = new Lightstring.JID(stanza.DOM.textContent);

          Conn.send(
            "<iq type='set' id='"+Lightstring.newId('sendiq:')+"'>" +
              "<session xmlns='urn:ietf:params:xml:ns:xmpp-session'/>" +
            "</iq>",
            function() {
              Conn.emit('connected');
            }
          );
        },
        //Error
        function(stanza) {
          //TODO: Error?
        }
      );
    }
  }
};
