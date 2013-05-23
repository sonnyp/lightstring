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