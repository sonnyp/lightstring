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

Lightstring.plugins['DIGEST-MD5'] = {
  handlers: {
    'mechanisms': function (stanza) {
      if(stanza.mechanisms.indexOf('DIGEST-MD5') === -1)
        return;

        this.send(
          "<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl'" +
               " mechanism='DIGEST-MD5'/>"
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
      var that = this;
      //TODO check if bind supported
      var bind =
        "<iq type='set' id='"+Lightstring.newId('sendiq:')+"'>" +
          "<bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'>" +
            (this.jid.resource? "<resource>" + this.jid.resource + "</resource>": "") +
          "</bind>" +
        "</iq>";
      this.send(
        bind,
        //Success
        function(stanza) {
          //Session http://xmpp.org/rfcs/rfc3921.html#session
          that.jid = new Lightstring.JID(stanza.DOM.textContent);
          that.send(
            "<iq type='set' id='"+Lightstring.newId('sendiq:')+"'>" +
              "<session xmlns='urn:ietf:params:xml:ns:xmpp-session'/>" +
            "</iq>",
            function() {
              that.emit('connected');
            }
          );
        },
        //Error
        function(stanza) {
          //TODO: Error?
        }
      );
    },
    'challenge': function (stanza) {
      //FIXME this is mostly Strophe code

      function _quote(str) {
        return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
      };

      var challenge = atob(stanza.DOM.textContent);

      var attribMatch = /([a-z]+)=("[^"]+"|[^,"]+)(?:,|$)/;

      var cnonce = MD5.hexdigest(Math.random() * 1234567890);
      var realm = '';
      var host = null;
      var nonce = '';
      var qop = '';
      var matches;

      while (challenge.match(attribMatch)) {
        matches = challenge.match(attribMatch);
        challenge = challenge.replace(matches[0], '');
        matches[2] = matches[2].replace(/^"(.+)"$/, '$1');
        switch (matches[1]) {
        case 'realm':
            realm = matches[2];
            break;
        case 'nonce':
            nonce = matches[2];
            break;
        case 'qop':
            qop = matches[2];
            break;
        case 'host':
            host = matches[2];
            break;
        }
      }

      var digest_uri = 'xmpp/' + this.jid.domain;
      if (host !== null)
          digest_uri = digest_uri + '/' + host;
      var A1 = MD5.hash(this.jid.node +
                        ':' + realm + ':' + this.password) +
                        ':' + nonce + ':' + cnonce;
      var A2 = 'AUTHENTICATE:' + digest_uri;

      var responseText = '';
      responseText += 'username=' + _quote(this.jid.node) + ',';
      responseText += 'realm=' + _quote(realm) + ',';
      responseText += 'nonce=' + _quote(nonce) + ',';
      responseText += 'cnonce=' + _quote(cnonce) + ',';
      responseText += 'nc="00000001",';
      responseText += 'qop="auth",';
      responseText += 'digest-uri=' + _quote(digest_uri) + ',';
      responseText += 'response=' + _quote(
          MD5.hexdigest(MD5.hexdigest(A1) + ':' +
                        nonce + ':00000001:' +
                        cnonce + ':auth:' +
                        MD5.hexdigest(A2))) + ',';
      responseText += 'charset="utf-8"';
      this.send(
        "<response xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>" +
          btoa(responseText) +
        "</response>");
    },
    'failure': function (stanza) {
      //TODO: throw an error?
    }
  }
};
