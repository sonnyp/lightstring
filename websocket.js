'use strict';

(function() {
  Lightstring.WebSocketConnection = function(aService) {
    this.service = aService;
  };
  Lightstring.WebSocketConnection.prototype = new EventEmitter();
  Lightstring.WebSocketConnection.prototype.connect = function() {
    // Standard
    if (typeof(WebSocket) === 'function')
      this.socket = new WebSocket(this.service, 'xmpp');
    // Safari
    else if (typeof(WebSocket) === 'object')
      this.socket = new WebSocket(this.service, 'xmpp');
    // Old Gecko
    else if (typeof(MozWebSocket) === 'function')
      this.socket = new MozWebSocket(this.service, 'xmpp');
    // No WebSocket support
    else
      return; //TODO: error

    var Conn = this;
    this.socket.addEventListener('open', function() {
    //FIXME: Opera/Safari WebSocket implementation doesn't support sub-protocol mechanism.
    //if (this.protocol !== 'xmpp')
      //return; //TODO: error
      Conn.emit('open')
    });
    this.socket.addEventListener('error', function(e) {
      Conn.emit('disconnecting', e.data);
      //TODO: error
    });
    this.socket.addEventListener('close', function(e) {
      Conn.emit('disconnected', e.data);
    });
    this.socket.addEventListener('message', function(e) {
      Conn.emit('stanza', e.data);
    });
  },
  Lightstring.WebSocketConnection.prototype.send = function(aStanza) {
    this.socket.send(aStanza);
  }
})();