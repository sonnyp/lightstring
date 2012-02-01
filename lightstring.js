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


/**
 * @namespace No code from lightstring should be callable outside this namespace/scope.
 */
var Lightstring = {
  /**
   * @namespace Holds XMPP namespaces.
   * @description http://xmpp.org/xmpp-protocols/protocol-namespaces
   */
  ns: {
    streams: 'http://etherx.jabber.org/streams',
    jabber_client: 'jabber:client'
  },
  /**
   * @namespace Holds XMPP stanza builders.
   */
  stanzas: {
    stream: {
      open: function(aService) {
        //FIXME no ending "/" - node-xmpp-bosh bug
        return "<stream:stream to='" + aService + "'" +
                             " xmlns='" + Lightstring.ns['jabber_client'] + "'" +
                             " xmlns:stream='" + Lightstring.ns['streams'] + "'" +
                             " version='1.0'/>";
      },
      close: function() {
        return "</stream:stream>";
      }
    },
    errors: {
      iq: function(type, error) {
        return "<iq to='" + stanza.DOM.getAttributeNS(null, 'from') + "'" +
                  " id='" + stanza.DOM.getAttributeNS(null, 'id') + "'" +
                  " type='error'>" +
                 "<error type='" + type + "'>" +
                   "<" + error + " xmlns='" + Lightstring.namespaces['xmpp_stanzas'] + "'/>" + //TODO: allow text content.
                    //TODO: allow text and payload.
                 "</error>" +
               "</iq>";
      }
    }
  },
  plugins: {},
  /**
   * @private
   */
  parser: new DOMParser(),
  /**
   * @private
   */
  serializer: new XMLSerializer(),
  /**
   * @function Transforms a XML string to a DOM object.
   * @param {String} aString XML string.
   * @return {Object} Domified XML.
   */
  XML2DOM: function(aString) {
    var DOM = null;
    try {
      DOM = this.parser.parseFromString(aString, 'text/xml').documentElement;
    }
    catch (e) {
      alert(e);
    }
    finally {
      return DOM;
    };
  },
  /**
   * @function Transforms a DOM object to a XML string.
   * @param {Object} aString DOM object.
   * @return {String} Stringified DOM.
   */
  DOM2XML: function(aElement) {
    var XML = null;
    try {
      XML = this.serializer.serializeToString(aElement);
    }
    catch (e) {
      //TODO throw error
    }
    finally {
      return XML;
    };
  },
  /**
   * @function Get an unique identifier.
   * @param {String} [aString] Prefix to put before the identifier.
   * @return {String} Identifier.
   */
  newId: (function() {
    var id = 1024;
    return function(prefix) {
      if (typeof prefix === 'string')
        return prefix + id++;
      return '' + id++;
    };
  })()
};

/**
 * @constructor Creates a new Lightstring connection
 * @param {String} [aService] The Websocket service URL.
 * @memberOf Lightstring
 */
Lightstring.Connection = function(aService) {
  if (aService)
    this.service = aService;
  this.handlers = {};
  this.callbacks = {};
};
Lightstring.Connection.prototype = {
  /**
   * @function Create and open a websocket then go though the XMPP authentification process.
   * @param {String} [aJid] The JID (Jabber id) to use.
   * @param {String} [aPassword] The associated password.
   */
  connect: function(aJid, aPassword) {
    this.emit('connecting');
    this.jid = new Lightstring.JID(aJid);
    if (aPassword)
      this.password = aPassword;

    if (!this.jid.bare)
      throw 'Lightstring: Connection.jid is undefined.';
    if (!this.service)
      throw 'Lightstring: Connection.service is undefined.';

    if(typeof(WebSocket) === "function") {
      this.socket = new WebSocket(this.service, 'xmpp');
    }
    else if(typeof(MozWebSocket) === "function") {
      this.socket = new MozWebSocket(this.service, 'xmpp');
    }
    else {
      throw new Error('WebSocket not available.');
    }

    var that = this;
    this.socket.addEventListener('open', function() {
      //TODO: if (this.protocol !== 'xmpp')

      var stream = Lightstring.stanzas.stream.open(that.jid.domain);
      //TODO: Use Lightstring.Connection.send (problem with parsing steam);
      that.socket.send(stream);
      var stanza = {
        XML: stream
      };
      that.emit('output', stanza);
    });
    this.socket.addEventListener('error', function(e) {
      that.emit('error', e.data);
      console.log(e.data);
    });
    this.socket.addEventListener('close', function(e) {
      that.emit('disconnected', e.data);
    });
    this.socket.addEventListener('message', function(e) {
      var stanza = new Lightstring.Stanza(e.data);

      //TODO node-xmpp-bosh sends a self-closing stream:stream tag; it is wrong!
      that.emit('input', stanza);

      if(!stanza.DOM)
        return;


      var name = stanza.DOM.localName;
      //FIXME SASL mechanisms and XMPP features can be both in a stream:features
      if (name === 'features') {
        //SASL mechanisms
        if (stanza.DOM.firstChild.localName === 'mechanisms') {
          stanza.mechanisms = [];
          var nodes = stanza.DOM.querySelectorAll('mechanism');
          for (var i = 0; i < nodes.length; i++)
            stanza.mechanisms.push(nodes[i].textContent);
          that.emit('mechanisms', stanza);
        }
        //XMPP features
        else {
          //TODO: stanza.features
          that.emit('features', stanza);
        }
      }
      else if (name === 'challenge') {
        that.emit('challenge', stanza);
      }
      else if (name === 'response') {


      }
      else if (name === 'failure') {
        that.emit('failure', stanza);
      }
      else if (name === 'success') {
        that.emit('success', stanza);
      }
      else if(name === 'stream') {


      }



      //Iq callbacks
      else if (name === 'iq') {
        var payload = stanza.DOM.firstChild;
        if (payload)
          that.emit('iq/' + payload.namespaceURI + ':' + payload.localName, stanza);

        var id = stanza.DOM.getAttributeNS(null, 'id');
        if (!(id && id in that.callbacks))
          return;

        var type = stanza.DOM.getAttributeNS(null, 'type');
        if (type !== 'result' && type !== 'error')
          return; //TODO: emit an warning, perhaps.

        var callback = that.callbacks[id];
        if (type === 'result' && callback.success)
          callback.success(stanza);
        else if (type === 'error' && callback.error)
          callback.error(stanza);

        delete that.callbacks[id];
      }
    });
  },
  /**
   * @function Send a message.
   * @param {String|Object} aStanza The message to send.
   * @param {Function} [aCallback] Executed on answer. (stanza must be iq)
   */
  send: function(aStanza, aSuccess, aError) {
    if (!(aStanza instanceof Lightstring.Stanza))
      var stanza = new Lightstring.Stanza(aStanza);
    else
      var stanza = aStanza;

    if(!stanza)
      return;

    if (stanza.DOM.tagName === 'iq') {
      var type = stanza.DOM.getAttributeNS(null, 'type');
      if (type !== 'get' || type !== 'set')
        ; //TODO: emit an error.

      var callback = {success: aSuccess, error: aError};

      var id = stanza.DOM.getAttributeNS(null, 'id');
      if (!id)
        ; //TODO: emit an warning.
      else
        this.callbacks[id] = callback;

    } else if (aSuccess || aError)
      ; //TODO: callback can’t be called with non-iq stanza.


    //TODO this.socket.send(stanza.XML); (need some work on Lightstring.Stanza)
    var fixme = Lightstring.DOM2XML(stanza.DOM);
    stanza.XML = fixme;
    this.socket.send(fixme);
    this.emit('output', stanza);
  },
  /**
   * @function Closes the XMPP stream and the socket.
   */
  disconnect: function() {
    this.emit('disconnecting');
    var stream = Lightstring.stanzas.stream.close();
    this.send(stream);
    this.emit('XMLOutput', stream);
    this.socket.close();
  },
  load: function() {
    for (var i = 0; i < arguments.length; i++) {
      var name = arguments[i];
      if (!(name in Lightstring.plugins))
        continue; //TODO: throw an error?

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
        this[name][method].bind(this);

      if (plugin.init)
        plugin.init();
    }
  },
  /**
   * @function Emits an event.
   * @param {String} aName The event name.
   * @param {Function|Array|Object} [aData] Data about the event.
   */
  emit: function(aName, aData) {
    var handlers = this.handlers[aName];
    if (!handlers)
      return;

    if (aData && aData.DOM && aData.DOM.localName !== 'iq') {
      for (var i = 0; i < handlers.length; i++)
        handlers[i].call(this, aData);

      return;
    }

    var ret;
    for (var i = 0; i < handlers.length; i++) {
      ret = handlers[i].call(this, aData);
      if (typeof ret !== 'boolean')
        return; //TODO: emit a big error!

      if (ret)
        return;
    }

    conn.send(Lightstring.stanzas.errors.iq('cancel', 'service-unavailable'));
  },
  /**
   * @function Register an event handler.
   * @param {String} aName The event name.
   * @param {Function} aCallback The callback to call when the event is emitted.
   */
  on: function(aName, callback) {
    if (!this.handlers[aName])
      this.handlers[aName] = [];
    this.handlers[aName].push(callback);
  }
};
