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

    return stanza;
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

/*
https://raw.github.com/astro/ltx/master/lib/element.js
*/


(function() {
'use strict';

/**
 * This cheap replica of DOM/Builder puts me to shame :-)
 *
 * Attributes are in the element.attrs object. Children is a list of
 * either other Elements or Strings for text content.
 **/
function Element(name, attrs) {
    this.name = name;
    this.parent = null;
    this.attrs = attrs || {};
    this.children = [];
}

/*** Accessors ***/

/**
 * if (element.is('message', 'jabber:client')) ...
 **/
Element.prototype.is = function(name, xmlns) {
    return this.getName() == name &&
        (!xmlns || this.getNS() == xmlns);
};

/* without prefix */
Element.prototype.getName = function() {
    if (this.name.indexOf(":") >= 0)
        return this.name.substr(this.name.indexOf(":") + 1);
    else
        return this.name;
};

/**
 * retrieves the namespace of the current element, upwards recursively
 **/
Element.prototype.getNS = function() {
    if (this.name.indexOf(":") >= 0) {
        var prefix = this.name.substr(0, this.name.indexOf(":"));
        return this.findNS(prefix);
    } else {
        return this.findNS();
    }
};

/**
 * find the namespace to the given prefix, upwards recursively
 **/
Element.prototype.findNS = function(prefix) {
    if (!prefix) {
        /* default namespace */
        if (this.attrs.xmlns)
            return this.attrs.xmlns;
        else if (this.parent)
            return this.parent.findNS();
    } else {
        /* prefixed namespace */
        var attr = 'xmlns:' + prefix;
        if (this.attrs[attr])
            return this.attrs[attr];
        else if (this.parent)
            return this.parent.findNS(prefix);
    }
};

/**
 * xmlns can be null
 **/
Element.prototype.getChild = function(name, xmlns) {
    return this.getChildren(name, xmlns)[0];
};

/**
 * xmlns can be null
 **/
Element.prototype.getChildren = function(name, xmlns) {
    var result = [];
    for(var i = 0; i < this.children.length; i++) {
          var child = this.children[i];
        if (child.getName &&
            child.getName() == name &&
            (!xmlns || child.getNS() == xmlns))
            result.push(child);
    }
    return result;
};

/**
 * xmlns and recursive can be null
 **/
Element.prototype.getChildByAttr = function(attr, val, xmlns, recursive) {
    return this.getChildrenByAttr(attr, val, xmlns, recursive)[0];
};

/**
 * xmlns and recursive can be null
 **/
Element.prototype.getChildrenByAttr = function(attr, val, xmlns, recursive) {
    var result = [];
    for(var i = 0; i < this.children.length; i++) {
          var child = this.children[i];
        if (child.attrs &&
            child.attrs[attr] == val &&
            (!xmlns || child.getNS() == xmlns))
            result.push(child);
        if (recursive && child.getChildrenByAttr)
            result.push(child.getChildrenByAttr(attr, val, xmlns, true));
    }
    if (recursive) result = [].concat.apply([], result);
    return result;
};

Element.prototype.getText = function() {
    var text = "";
    for(var i = 0; i < this.children.length; i++) {
    var child = this.children[i];
        if (typeof child == 'string')
            text += child;
    }
    return text;
};

Element.prototype.getChildText = function(name) {
    var text = null;
    for(var i = 0; i < this.children.length; i++) {
    var child = this.children[i];
        if (!text && child.name == name) {
            text = child.getText();
        }
    }
    return text;
};

/*** Builder ***/

/** returns uppermost parent */
Element.prototype.root = function() {
    if (this.parent)
        return this.parent.root();
    else
        return this;
};
Element.prototype.tree = Element.prototype.root;

/** just parent or itself */
Element.prototype.up = function() {
    if (this.parent)
        return this.parent;
    else
        return this;
};

/** create child node and return it */
Element.prototype.c = function(name, attrs) {
    return this.cnode(new Element(name, attrs));
};

Element.prototype.cnode = function(child) {
    this.children.push(child);
    child.parent = this;
    return child;
};

/** add text node and return element */
Element.prototype.t = function(text) {
    this.children.push(text);
    return this;
};

/*** Manipulation ***/

/**
 * Either:
 *   el.remove(childEl);
 *   el.remove('author', 'urn:...');
 */
Element.prototype.remove = function(el, xmlns) {
    var filter;
    /* 1st parameter is tag name */
    if (typeof el === 'string') {
        
        filter = function(child) {
            return !(child.is &&
                 child.is(el, xmlns));
        };
    }
    /* 1st parameter is element */
    else {
        filter = function(child) {
            return child !== el;
        };
    }

    this.children = this.children.filter(filter);

    return this;
};

/**
 * To use in case you want the same XML data for separate uses.
 * Please refrain from this practise unless you know what you are
 * doing. Building XML with ltx is easy!
 */
Element.prototype.clone = function() {
    var clone = new Element(this.name, {});
    for(var k in this.attrs) {
    if (this.attrs.hasOwnProperty(k))
        clone.attrs[k] = this.attrs[k];
    }
    for(var i = 0; i < this.children.length; i++) {
    var child = this.children[i];
    clone.cnode(child.clone ? child.clone() : child);
    }
    return clone;
};

Element.prototype.text = function(val) {
    if(val && this.children.length == 1){
        this.children[0] = val;
        return this;
    }
    return this.getText();
};

Element.prototype.attr = function(attr, val) {
    if(val){
        if(!this.attrs){
          this.attrs = {};
        }
        this.attrs[attr] = val;
        return this;
    }
    return this.attrs[attr];
};

/*** Serialization ***/

Element.prototype.toString = function() {
    var s = "";
    this.write(function(c) {
        s += c;
    });
    return s;
};

Element.prototype.write = function(writer) {
    writer("<");
    writer(this.name);
    for(var k in this.attrs) {
        var v = this.attrs[k];
    if (v || v === '' || v === 0) {
        writer(" ");
            writer(k);
            writer("=\"");
            if (typeof v != 'string')
        v = v.toString();
            writer(escapeXml(v));
            writer("\"");
    }
    }
    if (this.children.length == 0) {
        writer("/>");
    } else {
        writer(">");
    for(var i = 0; i < this.children.length; i++) {
        var child = this.children[i];
        /* Skip null/undefined */
        if (child || child === 0) {
        if (child.write)
            child.write(writer);
        else if (typeof child === 'string')
            writer(escapeXmlText(child));
        else if (child.toString)
            writer(escapeXmlText(child.toString()));
        }
        }
        writer("</");
        writer(this.name);
        writer(">");
    }
};

function escapeXml(s) {
    return s.
        replace(/\&/g, '&amp;').
        replace(/</g, '&lt;').
        replace(/>/g, '&gt;').
        replace(/"/g, '&quot;').
        replace(/'/g, '&apos;');
}

function escapeXmlText(s) {
    return s.
        replace(/\&/g, '&amp;').
        replace(/</g, '&lt;').
        replace(/>/g, '&gt;');
}

Lightstring.Element = Element;

})();

/**
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

//https://tools.ietf.org/html/rfc6122

(function() {
'use strict';

/**
 * @constructor Creates a new JID object.
 * @param {String} [aJID] The host, bare or full JID.
 * @memberOf Lightstring
 */
var JID = function(aJID) {
  this.local = null;
  this.domain = null;
  this.resource = null;

  if (aJID)
    this.full = aJID.toString();

  //TODO: use a stringprep library to validate the input.
};

JID.prototype = {
  toString: function() {
    return this.full;
  },

  equals: function(aJID) {
    if (!(aJID instanceof Lightstring.JID))
      aJID = new Lightstring.JID(aJID);

    return (this.local === aJID.local &&
            this.domain === aJID.domain &&
            this.resource === aJID.resource)
  },

  toBare: function() {
    var aJID = this;
    aJID.resource = null;
    return aJID;
  },

  get bare() {
    if (!this.domain)
      return null;

    if (this.local)
      return this.local + '@' + this.domain;

    return this.domain;
  },

  set bare(aJID) {
    if (!aJID)
      return;

    var s = aJID.indexOf('/');
    if (s != -1)
      aJID = aJID.substring(0, s);

    s = aJID.indexOf('@');
    if (s == -1) {
      this.local = null;
      this.domain = aJID;
    } else {
      this.local = aJID.substring(0, s);
      this.domain = aJID.substring(s+1);
    }
  },

  get full() {
    if (!this.domain)
      return null;

    var full = this.domain;

    if (this.local)
      full = this.local + '@' + full;

    if (this.resource)
      full = full + '/' + this.resource;

    return full;
  },

  set full(aJID) {

    if (!aJID)
      return;

    var s = aJID.indexOf('/');
    if (s == -1)
      this.resource = null;
    else {
      this.resource = aJID.substring(s+1);
      aJID = aJID.substring(0, s);
    }

    s = aJID.indexOf('@');
    if (s == -1) {
      this.local = null;
      this.domain = aJID;
    }
    else {
      this.local = aJID.substring(0, s);
      this.domain = aJID.substring(s+1);
    }
  }
};

Lightstring.JID = JID;

})();


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

/**
 * @private
 */
var doc = document.implementation.createDocument(null, 'dummy', null);
/**
 * @private
 */
var parser = new DOMParser();
/**
 * @private
 */
var serializer = new XMLSerializer();
/**
 * @function Process a XML string to a DOM tree.
 * @param {String} aString XML string.
 * @return {Object} Domified XML.
 */
var parse = function(aString) {
  var el = parser.parseFromString(aString, 'text/xml').documentElement;
  if (el.tagName === 'parsererror')
    ;//FIXME: do something?

  return el;
};
/**
 * @function Process a DOM tree to a ltx Element.
 * @param {Object} DOM tree.
 * @return {Object} ltx Element.
 */
var parseDOM = function(xml) {
  if (xml.nodeType !== 1 && xml.nodeType !== 9)
    return;

  var attrs = {};
  for (var i = 0, length = xml.attributes.length; i < length; i++)
    attrs[xml.attributes[i].name] = xml.attributes[i].value;

  var el = new Lightstring.Element(xml.tagName, attrs);

  //children
  for (var i = 0, length = xml.childNodes.length; i < length; i++) {
    if (xml.childNodes[i].nodeType === 3) {
      el.t(xml.childNodes[i].nodeValue).up();
    }
    else {
      el.cnode(parseDOM(xml.childNodes[i]));
    }
  }

  return el;
};
/**
 * @function Process a DOM treee to a XML string.
 * @param {Object} aString DOM object.
 * @return {String} Stringified DOM.
 */
var serialize = function(aElement) {
  var string = null;
  try {
    string = serializer.serializeToString(aElement);
  }
  catch (e) {
    //TODO: error
  }
  finally {
    return string;
  }
};
/**
 * @constructor Creates a new Stanza object.
 * @param {String|Object} [aStanza] The XML or DOM content of the stanza
 */
var Stanza = function(aStanza) {
  if (typeof aStanza === 'string') {
    var DOMTree = parse(aStanza);
    return parseDOM(DOMTree);
  }
  else if (aStanza instanceof Lightstring.Element)
    return aStanza;
  else
    return null;
};

Lightstring.Stanza = Stanza;
Lightstring.doc = doc;

})();

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
  The WebSocket API
      http://dev.w3.org/html5/websockets/
  An XMPP Sub-protocol for WebSocket
      https://tools.ietf.org/html/draft-moffitt-xmpp-over-websocket
*/

(function(Lightstring) {
'use strict';

var WebSocket = window.WebSocket || window.MozWebSocket || undefined;

var WebSocketTransport = function(aService) {
  this.service = aService;
};
/**
 * @function Called whenever data are being received
 * @param {String} aData The data
 */
WebSocketTransport.prototype.onRawIn = function(aData) {};
/**
 * @function Called whenever data are being sent
 * @param {String} aData The data
 */
WebSocketTransport.prototype.onRawOut = function(aData) {};
/**
 * @function Called whenever a stanza is received
 * @param {String} aStanza The stanza
 */
WebSocketTransport.prototype.onStanza = function(aStanza) {};
/**
 * @function Called whenever a stanza is sent
 * @param {String} aStanza The stanza
 */
WebSocketTransport.prototype.onOut = function(aStanza) {};
/**
 * @function Called whenever an error occurs
 * @param {Error} aError The error
 */
WebSocketTransport.prototype.onError = function(aError) {};
/**
 * @function Called whenever the transport is closed
 */
WebSocketTransport.prototype.onClose = function() {};
/**
 * @function Open the connection transport
 */
WebSocketTransport.prototype.open = function(aCallback) {
  if(!WebSocket)
    return aCallback(new Error('WebSocket not supported.'));

  this.socket = new WebSocket(this.service, 'xmpp');

  var that = this;
  this.socket.addEventListener('open', function() {
    var err = undefined;

    if (this.protocol !== 'xmpp')
      err = new Error('XMPP protocol not supported by the WebSocket server.');

    aCallback(err);
  });
  this.socket.addEventListener('error', function(e) {
    that.onError(e);
  });
  this.socket.addEventListener('close', function(e) {
    that.onClose(e);
  });
  this.socket.addEventListener('message', function(e) {
    that.onRawIn(e.data);
    that.onStanza(e.data);
  });
};
/**
 * @function Close the transport
 */
WebSocketTransport.prototype.close = function() {
  this.socket.close();
};
/**
 * @function Send data
 * @param {String} aData The data
 */
WebSocketTransport.prototype.send = function(aData) {
  var data = aData.toString();

  this.socket.send(data);
  this.onOut(data);
  this.onRawOut(data);
};

Lightstring.registerTransport('WebSocket', WebSocketTransport);
})(Lightstring);
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

(function(Lightstring) {
'use strict';

Lightstring.registerMechanism('PLAIN', {
  conn: null,
  onSuccess: function() {},
  onError: function() {},
  start: function(conn) {
    this.conn = conn;
    var token = btoa(
      conn.jid.bare +
      '\u0000' +
      conn.jid.local +
      '\u0000' +
      conn.password
    );

    conn.send(
      '<auth xmlns="urn:ietf:params:xml:ns:xmpp-sasl" mechanism="PLAIN">' + token + '</auth>'
    );
  },
  onStanza: function(stanza) {
    var conn = this.conn;
    var that = this;
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
              that.onSuccess();
            }
          );
        },
        //Error
        function(stanza) {
          that.onError();
        }
      );
    }
    else if (stanza.name === 'failure') {
      that.onError();
    }
  }
});
})(window.Lightstring);
