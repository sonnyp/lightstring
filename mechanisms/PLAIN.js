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
  The PLAIN Simple Authentication and Security Layer (SASL) Mechanism
    http://tools.ietf.org/html/rfc4616
*/

Lightstring.addMechanism('PLAIN', function(conn) {
  var token = btoa(
    conn.jid.bare +
    '\u0000' +
    conn.jid.local +
    '\u0000' +
    conn.password
  );

  conn.send(
    "<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl'" +
         " mechanism='PLAIN'>" + token + "</auth>"
  );

  var that = this;
  conn.addListener('stanza', function onStanza(stanza) {
    if (stanza.name === 'success') {
      conn.send(
        "<stream:stream to='" + conn.jid.domain + "'" +
                      " xmlns='jabber:client'" +
                      " xmlns:stream='http://etherx.jabber.org/streams'" +
                      " version='1.0'/>"
      );
    }
    else if (stanza.name === 'stream:features') {
      //TODO check if bind supported
      var bind =
        '<iq type="set">' +
          '<bind xmlns="urn:ietf:params:xml:ns:xmpp-bind">' +
            (conn.jid.resource ? ('<resource>' + conn.jid.resource + '</resource>') : '') +
          '</bind>' +
        '</iq>';
      conn.send(
        bind,
        //Success
        function(stanza) {
          //Session http://xmpp.org/rfcs/rfc3921.html#session
          conn.jid = new Lightstring.JID(stanza.getChild('bind').getChild('jid').text());
          conn.send(
            '<iq type="set">' +
              '<session xmlns="urn:ietf:params:xml:ns:xmpp-session"/>' +
            '</iq>',
            function() {
              conn.onAuthSuccess();
              conn.removeListener('stanza', onStanza);
            }
          );
        },
        //Error
        function(stanza) {
          conn.onAuthFailure();
          conn.removeListener('stanza', onStanza);
          //TODO: Error?
        }
      );
    }
    else if (stanza.name === 'failure') {
      conn.onAuthFailure();
      conn.removeListener('stanza', onStanza);
    }
  })
});