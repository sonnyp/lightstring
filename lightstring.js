'use strict';

var Lightstring = {
	NS: {},
	stanza: {},
};

Lightstring.Connection = function (aURL) {
  var parser = new DOMParser();
  var serializer = new XMLSerializer();
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
  this.connect = function(jid, password) {
    this.domain = jid.split('@')[1];
    this.node = jid.split('@')[0];
    this.jid = jid;
    this.password = password;
    if(typeof WebSocket === 'undefined')
      this.socket = new MozWebSocket(aURL);
    else
      this.socket = new WebSocket(aURL);

    var that = this;
    this.socket.addEventListener('open', function() {
      that.emit('open');
      that.send("<stream:stream to='"+that.domain+"' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0' />");
    });
    this.socket.addEventListener('error', function(err) {
      that.emit('error');
    });
    this.socket.addEventListener('close', function(close) {
			that.emit('close');
			that.emit('disconnected');
    });
    this.socket.addEventListener('message', function(e) {
      that.emit('XMLInput', e.data);
      var elm = that.parse(e.data);
      that.emit('DOMInput', elm);
      that.emit(elm.tagName, elm);

			if((elm.tagName === 'iq'))
				that.emit(elm.getAttribute('id'), elm);
    });
  };
  

  
  this.send = function(stanza, callback) {
    //FIXME support for E4X
    //~ if(typeof stanza === 'xml') {
      //~ stanza = stanza.toXMLString();
    //~ }
    if(stanza.cnode) {
			stanza = stanza.toString();
			//~ console.log(typeof stanza);
		}
    if(typeof stanza === 'string') {
      var str = stanza;
      var elm = this.parse(stanza);
    }
    else {
      var elm = stanza;
      var str = this.serialize(stanza);
    }
    
    
    if(elm.tagName === 'iq') {
			var id = elm.getAttribute('id');
      if(!id) {
        elm.setAttribute('id', this.getNewId())
        str = this.serialize(elm)
      }
      if(callback) this.on(elm.getAttribute('id'), callback);
    }
    
    
    this.socket.send(str);
    this.emit('XMLOutput', str);
    this.emit('DOMOutput', elm);
  };
  this.disconnect = function() {
		this.send('</stream:stream>');
		this.emit('disconnected');
		this.socket.close();
	};
  //FIXME Callbacks sucks, better idea?
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
        that.send("<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='DIGEST-MD5'/>");
      else if('PLAIN' in mechanisms) {
        var token = btoa(that.jid + "\u0000" + that.jid.split('@')[0] + "\u0000" + that.password);
        that.send("<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='PLAIN'>"+token+"</auth>");
      }
    }
    //XMPP features
    else {
      that.emit('features', stanza);
      //Bind http://xmpp.org/rfcs/rfc3920.html#bind
      that.send("<iq type='set' xmlns='jabber:client'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'/></iq>", function() {
        //Session http://xmpp.org/rfcs/rfc3921.html#session
        that.send("<iq type='set' xmlns='jabber:client'><session xmlns='urn:ietf:params:xml:ns:xmpp-session'/></iq>", function() {
          that.emit('connected');
        });
      });
    }
  });
  //Internal
  this.on('success', function(stanza, that) {
    that.send("<stream:stream to='"+that.domain+"' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0' />");
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

    that.send("<response xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>"+btoa(responseText)+"</response>");
  });
};
