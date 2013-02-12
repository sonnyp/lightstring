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

(function() {

  window.Lightstring = {
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
     * @namespace Holds Lightstring plugins
     */
    plugins: {},
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
      if (!s)
        return false;

      return s.
        replace(/\&/g, '&amp;').
        replace(/</g, '&lt;').
        replace(/>/g, '&gt;').
        replace(/"/g, '&quot;').
        replace(/'/g, '&apos;');
    },
    unescape: function(s) {
      if (!s)
        return false;

      //FIXME android client doesn't escape URL correctly
      return unescape(s.
        replace(/&amp;/g, '&').
        replace(/&lt;/g, '<').
        replace(/&gt;/g, '>').
        replace(/&quot;/g, '"').
        replace(/&apos;/g, "'"));
    }
  };

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

    Lightstring.connections.push(this);
  };
  Lightstring.Connection.prototype = new EventEmitter();
  Lightstring.Connection.prototype.onTransportLoaded = function() {

    var that = this;

    this.transport.onOpen = function() {
      that.emit('open');
    };
    this.transport.onError = function(e) {
      that.emit('error', e)
    };
    this.transport.onClose = function(e) {
      that.emit('close', e)
    };
    this.transport.onOut = function(stanza) {
      setTimeout(function() {
        that.emit('out', stanza);
      }, 0);
    };
    this.transport.onStanza = function(stanza) {
      var stanza = new Lightstring.Stanza(stanza);

      //FIXME: node-xmpp-bosh sends a self-closing stream:stream tag; it is wrong!

      that.emit('stanza', stanza);

      //Authentication
      //FIXME SASL mechanisms and XMPP features can be both in a stream:features
      if (stanza.name === 'stream:features') {
        for (var i = 0, length = stanza.children.length; i < length; i++) {
          //SASL mechanisms
          if(stanza.children[i].name === 'mechanisms') {

            stanza.mechanisms = [];
            var nodes = stanza.children[i].getChildren('mechanism');
            for (var i = 0; i < nodes.length; i++)
              stanza.mechanisms.push(nodes[i].text());
            that.emit('mechanisms', stanza);
            return;
          }
        }
        that.emit('features', stanza);
      }
      else if (stanza.name === 'challenge') {
        that.emit('challenge', stanza);
      }
      else if (stanza.name === 'failure') {
        that.emit('error', stanza);
      }
      else if (stanza.name === 'success') {
        that.emit('success', stanza);
      }

      //Iq callbacks
      else if (stanza.name === 'iq') {
        var id = stanza.attr('id');
        if (!(id && id in that.callbacks))
          return;

        var type = stanza.attr('type');
        // if (type !== 'result' && type !== 'error')
        //   return; //TODO: warning

        var callback = that.callbacks[id];
        if (type === 'result' && callback.success)
          callback.success.call(that, stanza);
        else if (type === 'error' && callback.error)
          callback.error.call(that, stanza);

        delete that.callbacks[id];
      }

      else if (stanza.name === 'presence' || stanza.name === 'message') {
        that.emit(stanza.name, stanza);
      }
    }
    this.transport.open(function(err) {
      if (err)
        ;//FIXME do something

      var stream = Lightstring.stanzas.stream.open(that.jid.domain);
      that.transport.send(stream);
    });
  };
  /**
   * @function Create and open a websocket then go though the XMPP authentification process.
   * @param {String} [aJid] The JID (Jabber id) to use.
   * @param {String} [aPassword] The associated password.
   */
  Lightstring.Connection.prototype.connect = function(aJid, aPassword) {
    this.emit('connecting');
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
      this.transport = new Lightstring.BOSHTransport(this.service, this.jid);
    else if (protocol.match('ws'))
      this.transport = new Lightstring.WebSocketTransport(this.service, this.jid);

    this.onTransportLoaded();
  };
  /**
   * @function Send a message.
   * @param {String|Object} aStanza The message to send.
   * @param {Function} [aCallback] Executed on answer. (stanza must be iq)
   */
  Lightstring.Connection.prototype.send = function(aStanza, aOnSuccess, aOnError) {
    if (!(aStanza instanceof Lightstring.Stanza))
      var stanza = new Lightstring.Stanza(aStanza);
    else
      var stanza = aStanza;

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
  };
  /**
   * @function Closes the XMPP stream and the socket.
   */
  Lightstring.Connection.prototype.disconnect = function() {
    this.emit('disconnecting');
    var stream = Lightstring.stanzas.stream.close();
    this.transport.send(stream);
    this.emit('out', stream);
    this.transport.close();
  };
  Lightstring.Connection.prototype.load = function() {
    for (var i = 0; i < arguments.length; i++) {
      var name = arguments[i];
      if (!(name in Lightstring.plugins))
        continue; //TODO: error

      var plugin = Lightstring.plugins[name];

      //Namespaces
      for (var ns in plugin.namespaces)
        Lightstring.ns[ns] = plugin.namespaces[ns];

      //Stanzas
      Lightstring.stanzas[name] = {};
      for (var stanza in plugin.stanzas)
        Lightstring.stanzas[name][stanza] = plugin.stanzas[stanza];

      //Handlers
      for (var handler in plugin.handlers)
        this.on(handler, plugin.handlers[handler]);

      //Methods
      this[name] = {};
      for (var method in plugin.methods)
        this[name][method] = plugin.methods[method].bind(this);

      if (plugin.init)
        plugin.init.apply(this);
    }
  };
})();