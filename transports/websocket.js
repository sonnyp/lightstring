'use strict';

(function() {
  Lightstring.WebSocket = WebSocket || MozWebSocket || undefined;
  Lightstring.WebSocketConnection = function(aService, aJid) {
    this.service = aService;
    this.jid = aJid;
  };
  Lightstring.WebSocketConnection.prototype = new EventEmitter();
  Lightstring.WebSocketConnection.prototype.open = function() {
    if(!Lightstring.WebSocket)
      return; //TODO: error

    this.socket = new WebSocket(this.service, 'xmpp');

    var that = this;
    this.socket.addEventListener('open', function() {
      //FIXME: Opera/Safari WebSocket implementation doesn't support sub-protocol mechanism.
      //if (this.protocol !== 'xmpp')
        //return; //TODO: error
      that.emit('open');

      var stream = Lightstring.stanzas.stream.open(that.jid.domain);
      var stanza = new Lightstring.Stanza();
      stanza.toString = function() {
        return stream;
      }
      that.send(stanza);
    });
    this.socket.addEventListener('error', function(e) {
      that.emit('disconnecting', e.data);
      //TODO: error
    });
    this.socket.addEventListener('close', function(e) {
      that.emit('disconnected', e.data);
    });
    this.socket.addEventListener('message', function(e) {
      var stanza = new Lightstring.Stanza(e.data);
      that.emit('in', stanza);
    });
  };
  Lightstring.WebSocketConnection.prototype.send = function(aStanza) {
    this.emit('out', aStanza);
    this.socket.send(aStanza.toString());
  };
})();