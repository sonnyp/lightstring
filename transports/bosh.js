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
  XEP-0124: Bidirectional-streams Over Synchronous HTTP (BOSH)
      http://xmpp.org/extensions/xep-0124.html
  XEP-0206: XMPP Over BOSH
      http://xmpp.org/extensions/xep-0206.html
*/

(function(Lightstring) {
'use strict';

var BOSHTransport = function(aService, aJID) {
  this.service = aService;
  this.rid = 1337;
  this.jid = aJID;
  this.currentRequests = 0;
  this.maxHTTPRetries = 5;
  this.maxRequests = 2;
  this.queue = [];
  this.status = 'close';
};
/**
 * @function Called whenever data are being received
 * @param {String} aData The data
 */
BOSHTransport.prototype.onRawIn = function(aData) {};
/**
 * @function Called whenever data are being sent
 * @param {String} aData The data
 */
BOSHTransport.prototype.onRawOut = function(aData) {};
/**
 * @function Called whenever a stanza is received
 * @param {String} aStanza The stanza
 */
BOSHTransport.prototype.onStanza = function(aStanza) {};
/**
 * @function Called whenever a stanza is sent
 * @param {String} aStanza The stanza
 */
BOSHTransport.prototype.onOut = function(aStanza) {};
/**
 * @function Called whenever an error occurs
 * @param {Error} aError The error
 */
BOSHTransport.prototype.onError = function(aError) {};
/**
 * @function Called whenever the transport is closed
 */
BOSHTransport.prototype.onClose = function() {};

BOSHTransport.prototype.onIn = function(stanza) {
  this.onStanza(stanza);

  if (this.status !== 'open') {
    if (stanza.name === 'success') {
      this.request({
        'to': this.jid.domain,
        'xmpp:restart': 'true',
        'xmlns:xmpp': 'urn:xmpp:xbosh'
      });
    }
  }
};
BOSHTransport.prototype.open = function() {
  var that = this;

  var attrs = {
    wait: '60',
    hold: '1',
    to: this.jid.domain,
    content: 'text/xml; charset=utf-8',
    ver: '1.6',
    'xmpp:version': '1.0',
    'xmlns:xmpp': 'urn:xmpp:xbosh'
  };

  this.request(attrs, [], function(data) {
    that.onOpen();
    that.sid = data.attrs['sid'];
    that.maxRequests = data.attrs['maxRequests'] || that.maxRequests;
    if (!data.getChild('stream:features')) {
      that.request();
    }
  });
};
BOSHTransport.prototype.request = function(attrs, children, aOnSuccess, aOnError, aRetry) {
  if (!children)
    children = [];

  var body = '<body rid="' + this.rid++ + '" xmlns="http://jabber.org/protocol/httpbind"';
  if (this.sid)
    body += ' sid="' + this.sid + '"';

  //sid
  // if (this.sid)
  //   body.attrs['sid'] = this.sid;

  //attributes on body
  for (var i in attrs)
    body += ' ' + i + '="' + attrs[i] + '"';
    // body.attrs[i] = attrs[i];
    // 

  if (children && children.length > 0) {
    body += '>'
    //children
    for (var i = 0, length = children.length; i < length; i++) {
      // console.log(children[i])
      // body.children.push(children[i])
      // body.c(new Lightstring.Stanza(children[i]));
      body += children[i].toString();
    };

    body += '</body>';
  }
  else {
    body += '/>'
  }

  var retry = aRetry || 0;

  var req = new XMLHttpRequest();
  req.open('POST', this.service);


  // req.upload.addEventListener("progress", updateProgress, false);
  // req.upload.addEventListener("load", transferComplete, false);
  // req.upload.addEventListener("error", transferFailed, false);
  // req.upload.addEventListener("abort", transferCanceled, false);

  // req.addEventListener("progress", updateProgress, false);
  // req.addEventListener("load", transferComplete, false);
  // req.addEventListener("error", transferFailed, false);
  // req.addEventListener("abort", transferCanceled, false);

  var that = this;
  req.addEventListener('load', function() {
    if (req.status < 200 || req.status >= 400) {
      that.onError('HTTP status ' + req.status);
      that.onClose();
      return;
    }
    that.currentRequests--;

    var payload = this.response;
    that.onRawIn(payload);
    var payloadEl = new Lightstring.Stanza(payload);
    that.processResponse(payloadEl);
    if (aOnSuccess)
      aOnSuccess(payloadEl);

  }, false);
  // req.on('error', function(error) {
  //   if (retry < that.maxHTTPRetries) {
  //     that.request(attrs, children, aOnSuccess, aOnError, ++retry);
  //   }
  //   else {
  //     that.emit('close');
  //     that.emit('error', error);
  //     if (aOnError)
  //       aOnError(error);
  //   }
  // });
  // this.emit('rawout', body.toString());
  if (body.children) {
    for(var i = 0; i < body.children.length; i++) {
      var child = body.children[i];
      that.onIn(new Lightstring.Stanza(child));
    }
  }

  var bodyStr = body.toString();

  this.onRawOut(bodyStr);

  req.send(bodyStr);
  this.currentRequests++;
};
BOSHTransport.prototype.send = function(data) {
  data = data.toString();

  this.queue.push(data);

  setTimeout(this.mayRequest.bind(this), 0);
};
BOSHTransport.prototype.end = function(stanzas) {
    var that = this;

    stanzas = stanzas || [];
    if (typeof stanzas !== 'array')
      stanzas = [stanzas];

    stanzas = this.queue.concat(stanzas);
    this.queue = [];
    this.request({type: 'terminate'}, stanzas,
      function(err, bodyEl) {
        that.emit('end');
        that.emit('close');
        delete that.sid;
    });
};
BOSHTransport.prototype.processResponse = function(bodyEl) {
  var children = bodyEl.children;
  if (children) {
    for(var i = 0; i < children.length; i++) {
      var child = children[i];
      var stanza = new Lightstring.Stanza(child);
      this.onIn(stanza);
    }
  }
  else if (bodyEl.attrs['type'] === 'terminate') {
    var condition = bodyEl.attrs['condition'];
    this.onError(new Error(condition || "Session terminated"));
    this.onClose();
  }
};
BOSHTransport.prototype.mayRequest = function() {
  var canRequest =
    this.sid && (this.currentRequests === 0 || ((this.queue.length > 0 && this.currentRequests < this.maxRequests))
  );

  if (!canRequest)
    return;

  var stanzas = this.queue;
  this.queue = [];

  var that = this;
  this.request({}, stanzas,
    //success
    function(data) {
      //if (data)
        //that.processResponse(data);
      setTimeout(that.mayRequest.bind(that), 0);

    },
    //error
    function(error) {
      console.log('error')
      that.onError(error);
      that.onClose();
      delete that.sid;
    }
  );
};

Lightstring.registerTransport('BOSH', BOSHTransport);
})(Lightstring);