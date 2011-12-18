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

var Lightstring = {
	NS: {},
	stanza: {},
};

Lightstring.Connection = function (aService) {
  var parser = new DOMParser();
  var serializer = new XMLSerializer();
  this.service = aService;
  this.handlers = {};
  this.iqid = 1024;
  this.getNewId = function() {
    this.iqid++;
    return 'sendiq:'+this.iqid;
  };
  this.parse = function(str) {
    return parser.parseFromString(str, 'text/xml').documentElement;
  };
  this.serialize = function(elm) {
    return serializer.serializeToString(elm);
  };
  this.connect = function(aJid, aPassword) {
    if(aJid)
      this.jid = aJid;
    if(this.jid) {
      this.domain = this.jid.split('@')[1];
      this.node = this.jid.split('@')[0];
      this.resource = this.jid.split('/')[1];
    }
    if(aPassword)
      this.password = aPassword;

    if(!this.jid)
      throw "Lightstring: Connection.jid is undefined.";
    if(!this.password)
      throw "Lightstring: Connection.password is undefined.";
    if(!this.service)
      throw "Lightstring: Connection.service is undefined.";

    //"Bug 695635 - tracking bug: unprefix WebSockets" https://bugzil.la/695635   
    if(MozWebSocket)
      this.socket = new MozWebSocket(this.service);
    else if(WebSocket)
      this.socket = new WebSocket(this.service);
    else
      this.emit('error', 'No WebSocket support.');

    var that = this;
    this.socket.addEventListener('open', function() {
      that.emit('connecting');
      //FIXME there shouldn't be an ending "/"
      that.send(
        "<stream:stream to='"+that.domain+"'\
                        xmlns='jabber:client'\
                        xmlns:stream='http://etherx.jabber.org/streams'\
                        version='1.0'/>"
      );
    });
    this.socket.addEventListener('error', function(e) {
      that.emit('error', e.data);
    });
    this.socket.addEventListener('close', function(e) {
			that.emit('disconnected', e.data);
    });
    this.socket.addEventListener('message', function(e) {
      that.emit('XMLInput', e.data);
      var elm = that.parse(e.data);
      that.emit('DOMInput', elm);
      that.emit(elm.tagName, elm);

			if(elm.tagName === 'iq')
				that.emit(elm.getAttribute('id'), elm);
    });
  };
  this.send = function(aStanza, aCallback) {
    if(typeof aStanza === 'string') {
      var str = aStanza;
      var elm = this.parse(str);
    }
    else if(aStanza instanceof Element) {
      var elm = aStanza;
      var str = this.serialize(elm);
    }
    else {
      that.emit('error', 'Unsupported data type.');
    }
    
    
    if(elm.tagName === 'iq') {
			var id = elm.getAttribute('id');
      if(!id) {
        elm.setAttribute('id', this.getNewId())
        str = this.serialize(elm)
      }
      if(aCallback)
        this.on(elm.getAttribute('id'), aCallback);
    }
    else if(aCallback) {
      that.emit('warning', 'Callback can\'t be called with non-iq stanza.');
    }
    
    
    this.socket.send(str);
    this.emit('XMLOutput', str);
    this.emit('DOMOutput', elm);
  };
  this.disconnect = function() {
		this.emit('disconnecting');
		this.send('</stream:stream>');
		this.socket.close();
    this.emit('disconnected');
	};
  this.emit = function(name, data) {
    var handlers = this.handlers[name];
    if(!handlers)
      return;

    //FIXME Better idea than passing the context as argument?
    for(var i=0; i<handlers.length; i++)
      handlers[i](data, this);

    if(name.match('sendiq:'))
      delete this.handlers[name];
  };
  this.on = function(name, callback) {
    if(!this.handlers[name])
      this.handlers[name] = [];
    this.handlers[name].push(callback);
  };
  //FIXME do this!
  this.once = function(name, callback) {
    if(!this.handlers[name])
      this.handlers[name] = [];
    this.handlers[name].push(callback);
  };
  //Internal
  this.on('stream:features', function(stanza, that) {
    var nodes = stanza.querySelectorAll('mechanism');
    //SASL/Auth features
    if(nodes.length > 0) {
      that.emit('mechanisms', stanza);
      var mechanisms = {};
      for(var i=0; i<nodes.length; i++)
        mechanisms[nodes[i].textContent] = true;
      
      
      //FIXME support SCRAM-SHA1 && allow specify method preferences  
      if('DIGEST-MD5' in mechanisms)
        that.send(
          "<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl'\
                 mechanism='DIGEST-MD5'/>"
        );
      else if('PLAIN' in mechanisms) {
        var token = btoa(
          that.jid +
          "\u0000" +
          that.jid.node +
          "\u0000" + 
          that.password
        );
        that.send(
          "<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl'\
                 mechanism='PLAIN'>"+token+"</auth>"
        );
      }
    }
    //XMPP features
    else {
      that.emit('features', stanza);
      //Bind http://xmpp.org/rfcs/rfc3920.html#bind
      that.send(
        "<iq type='set' xmlns='jabber:client'>\
          <bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'/>\
         </iq>",
        function() {
        //Session http://xmpp.org/rfcs/rfc3921.html#session
        that.send(
          "<iq type='set' xmlns='jabber:client'>\
            <session xmlns='urn:ietf:params:xml:ns:xmpp-session'/>\
          </iq>",
          function() {
            that.emit('connected');
          }
        );
      });
    }
  });
  //Internal
  this.on('success', function(stanza, that) {
    that.send(
      "<stream:stream to='"+that.domain+"'\
                      xmlns='jabber:client'\
                      xmlns:stream='http://etherx.jabber.org/streams'\
                      version='1.0' />"
    );
  });
  //Internal
  this.on('challenge', function(stanza, that) {
    //FIXME this is mostly Strophe code
    
    function _quote(str) {
      return '"' + str.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
    };
    
    var challenge = atob(stanza.textContent);
    
    var attribMatch = /([a-z]+)=("[^"]+"|[^,"]+)(?:,|$)/;

    var cnonce = MD5.hexdigest(Math.random() * 1234567890);
    var realm = "";
    var host = null;
    var nonce = "";
    var qop = "";
    var matches;

    while (challenge.match(attribMatch)) {
      matches = challenge.match(attribMatch);
      challenge = challenge.replace(matches[0], "");
      matches[2] = matches[2].replace(/^"(.+)"$/, "$1");
      switch (matches[1]) {
      case "realm":
          realm = matches[2];
          break;
      case "nonce":
          nonce = matches[2];
          break;
      case "qop":
          qop = matches[2];
          break;
      case "host":
          host = matches[2];
          break;
      }
    }

    var digest_uri = "xmpp/" + that.domain;
    if (host !== null) {
        digest_uri = digest_uri + "/" + host;
    }
    var A1 = MD5.hash(that.node +
                      ":" + realm + ":" + that.password) +
        ":" + nonce + ":" + cnonce;
    var A2 = 'AUTHENTICATE:' + digest_uri;

    var responseText = "";
    responseText += 'username=' + _quote(that.node) + ',';
    responseText += 'realm=' + _quote(realm) + ',';
    responseText += 'nonce=' + _quote(nonce) + ',';
    responseText += 'cnonce=' + _quote(cnonce) + ',';
    responseText += 'nc="00000001",';
    responseText += 'qop="auth",';
    responseText += 'digest-uri=' + _quote(digest_uri) + ',';
    responseText += 'response=' + _quote(
        MD5.hexdigest(MD5.hexdigest(A1) + ":" +
                      nonce + ":00000001:" +
                      cnonce + ":auth:" +
                      MD5.hexdigest(A2))) + ',';
    responseText += 'charset="utf-8"';
    that.send(
      "<response xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>"
        +btoa(responseText)+
      "</response>");
  });
};
