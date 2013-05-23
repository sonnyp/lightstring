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

(function() {
'use strict';

var Lightstring = {
  /*
   * @namespace Holds XMPP namespaces.
   * @description http://xmpp.org/xmpp-protocols/protocol-namespaces
   */
  ns: {
    streams: 'http://etherx.jabber.org/streams',
    jabber_client: 'jabber:client',
    xmpp_stanzas: 'urn:ietf:params:xml:ns:xmpp-stanzas'
  },
  /**
   * @namespace Holds XMPP stanza builders.
   */
  stanzas: {
    stream: {
      open: function(aService) {
        return (
          '<stream:stream to="' + aService + '" ' +
            'xmlns="' + Lightstring.ns['jabber_client'] + '" ' +
            'xmlns:stream="' + Lightstring.ns['streams'] + '" ' +
            'version="1.0">'
        );
      },
      close: function() {
        return '</stream:stream>';
      }
    },
    errors: {
      iq: function(from, id, type, error) {
        return (
          '<iq to="' + from + '" id="' + id + '" type="error">' +
             '<error type="' + type + '">' +
               '<' + error + ' xmlns="' + Lightstring.ns['xmpp_stanzas'] + '"/>' + //TODO: allow text content.
                //TODO: allow text and payload.
             '</error>' +
           '</iq>'
        );
      }
    }
  },
  /**
   * @namespace Holds SASL mechanisms handlers
   */
  mechanisms: {},
  /**
   * @namespace Holds transport methods
   */
  transports: {},
  /**
   * @private Holds the connections
   */
  connections: [],
  /**
   * @function Returns a new unique identifier.
   * @param {String} [aPrefix] Prefix to put before the identifier.
   * @return {String} Identifier.
   */
  id: function(aPrefix) {
    return (aPrefix || '') + Date.now() + Math.random();
  },
  escape: function(s) {
    s = s.toString();
    if (!s)
      return '';

    return s.
      replace(/\&/g, '&amp;').
      replace(/</g, '&lt;').
      replace(/>/g, '&gt;').
      replace(/"/g, '&quot;').
      replace(/'/g, '&apos;');
  },
  unescape: function(s) {
    s = s.toString();
    if (!s)
      return '';

    //FIXME android client doesn't escape URL correctly
    return unescape(s.
      replace(/&amp;/g, '&').
      replace(/&lt;/g, '<').
      replace(/&gt;/g, '>').
      replace(/&quot;/g, '"').
      replace(/&apos;/g, "'"));
  },
  registerMechanism: function(name, handler) {
    this.mechanisms[name] = handler;
  },
  registerTransport: function(name, transport) {
    this.transports[name] = transport;
  }
};

window.Lightstring = Lightstring;

/**
 * @constructor Creates a new Lightstring connection
 * @param {String} [aService] The connection manager URL.
 * @memberOf Lightstring
 */
Lightstring.Connection = function(aService) {
  if (aService)
    this.service = aService;

  /**
   * @namespace Holds connection events handlers
   */
  this.handlers = {};
  /**
   * @namespace Holds connection iq callbacks
   */
  this.callbacks = {};

  /**
   * @status Holds connection status
   */
  this.status = 'disconnected';

  this.onOpen = function(){};
  this.onConnecting = function(){};
  this.onConnected = function(){};
  this.onError = function(){};
  this.onClose = function(){};
  this.onFailure = function(){};
  this.onDisconnecting = function(){};
  this.onAuthFailure = function(){};
  this.onStanza = function(){};
  this.onOut = function(){};

  Lightstring.connections.push(this);
};
Lightstring.Connection.prototype = {
  /**
   * @function Create and open a websocket then go though the XMPP authentification process.
   * @param {String} [aJid] The JID (Jabber id) to use.
   * @param {String} [aPassword] The associated password.
   */
  connect: function(aJid, aPassword, aCallback) {
    this.onConnecting();
    this.jid = new Lightstring.JID(aJid);

    if (aPassword)
      this.password = aPassword;

    if (!this.jid.bare)
      return; //TODO: error
    if (!this.service)
      return; //TODO: error

    function getProtocol(aURL) {
      var a = document.createElement('a');
      a.href = aURL;
      return a.protocol.replace(':', '');
    }
    var protocol = getProtocol(this.service);

    if (protocol.match('http'))
      this.transport = new Lightstring.transports['BOSH'](this.service, this.jid);
    else if (protocol.match('ws'))
      this.transport = new Lightstring.transports['WebSocket'](this.service, this.jid);

    var that = this;

    this.transport.onOpen = function() {
      that.onOpen();
    };
    this.transport.onError = function(e) {
      that.onError(e);
    };
    this.transport.onClose = function(e) {
      that.onClose(e);
      that.status = 'disconnected';
    };
    this.transport.onOut = function(stanza) {
      //FIXME why setTimeout here?
      setTimeout(function() {
        that.onOut(stanza);
      }, 0);
    };
    this.transport.onStanza = function(stanza) {
      stanza = new Lightstring.Stanza(stanza);

      //FIXME: node-xmpp-bosh sends a self-closing stream:stream tag; it is wrong!

      that.onStanza(stanza);

      //Mechanism has already been choosen
      if (that.mechanism && that.status !== 'connected') {
        that.mechanism.onStanza(stanza);
      }
      //Authentication
      else if (stanza.name === 'stream:features') {
        var mechanisms = stanza.getChild('mechanisms', 'urn:ietf:params:xml:ns:xmpp-sasl');
        if (!mechanisms)
          return;

        //FIXME: ability to choose what mechanism to use
        var nodes = mechanisms.getChildren('mechanism');
        for (var i = 0; i < nodes.length; i++) {
          var mechanism = nodes[i].text();
          if (Lightstring.mechanisms[mechanism]) {
            that.mechanism = Lightstring.mechanisms[mechanism];
            that.mechanism.onError = function() {
              delete that.mechanism;
              that.status = 'auth failed';
              that.onAuthFailure();
            };
            that.mechanism.onSuccess = function() {
              delete that.mechanism;
              that.status = 'connected';
              that.onConnected();
            };
            that.mechanism.start(that);
            return;
          }
        }
        DEBUG('Server doesn\'t support any of the SASL mechanisms');
        this.close();
      }


      //Iq callbacks
      if (stanza.name === 'iq') {
        var id = stanza.attr('id');
        var callback = that.callbacks[id];
        if (!callback)
          return;

        var type = stanza.attr('type');
        if (type === 'result' && callback.success)
          callback.success.call(that, stanza);
        else if (type === 'error' && callback.error)
          callback.error.call(that, stanza);

        delete that.callbacks[id];
      }
    };
    this.transport.open(function(err) {
      if (err)
        ;//FIXME do something

      var stream = Lightstring.stanzas.stream.open(that.jid.domain);
      that.transport.send(stream);
    });
  },
  /**
   * @function Send a message.
   * @param {String|Object} aStanza The message to send.
   * @param {Function} [aCallback] Executed on answer. (stanza must be iq)
   */
  send: function(aStanza, aOnSuccess, aOnError) {
    var stanza;
    if (!(aStanza instanceof Lightstring.Stanza))
      stanza = new Lightstring.Stanza(aStanza);
    else
      stanza = aStanza;

    if ((stanza.name === 'message' || stanza.name === 'presence' || stanza.name === 'iq') && !stanza.attrs.from) {
      stanza.attrs.from = this.jid.full;
    }

    if (stanza.name === 'iq') {
      // var type = stanza.attr('type');
      // if (type !== 'get' || type !== 'set')
      //   ; //TODO: error

      var callback = {success: aOnSuccess, error: aOnError};

      var id = stanza.attr('id');
      if (!id)
        stanza.attr('id', Lightstring.id());

      this.callbacks[stanza.attr('id')] = callback;
    }
    else if (aOnSuccess || aOnError)
      ; //TODO: warning (no callback without iq)

    this.transport.send(stanza.toString());
  },
  /**
   * @function Closes the XMPP stream and the socket.
   */
  disconnect: function() {
    this.onDisconnecting();
    var stream = Lightstring.stanzas.stream.close();
    this.transport.send(stream);
    this.onOut(stream);
    this.transport.close();
  }
};
})(window);
