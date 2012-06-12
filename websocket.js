'use strict';

(function() {
  Lightstring.WebSocketConnection = function(aService) {
    this.service = aService;
  };
  Lightstring.WebSocketConnection.prototype = new EventEmitter();
  Lightstring.WebSocketConnection.prototype.open = function() {
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

    var that = this;
    this.socket.addEventListener('open', function() {
      //FIXME: Opera/Safari WebSocket implementation doesn't support sub-protocol mechanism.
      //if (this.protocol !== 'xmpp')
        //return; //TODO: error
      that.emit('open');

      var stream = Lightstring.stanzas.stream.open(that.jid.domain);
      this.socket.send(stream);
      var stanza = {
        XML: stream
      };
      that.emit('out', stanza);
    });
    this.socket.addEventListener('error', function(e) {
      that.emit('disconnecting', e.data);
      //TODO: error
    });
    this.socket.addEventListener('close', function(e) {
      that.emit('disconnected', e.data);
    });
    this.socket.addEventListener('message', function(e) {
      that.emit('in', e.data);
    });
  };
  Lightstring.WebSocketConnection.prototype.send = function(aStanza) {
    this.socket.send(aStanza);
    that.emit('out', aStanza);
  };
})();