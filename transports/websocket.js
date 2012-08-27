'use strict';

(function() {
  var WebSocket = window.WebSocket || window.MozWebSocket || undefined;

  var WebSocketTransport = function(aService, aJid) {
    this.service = aService;
    this.jid = aJid;
  };
  WebSocketTransport.prototype = new EventEmitter();
  WebSocketTransport.prototype.open = function() {
    if(!WebSocket)
      return; //TODO: error

    this.socket = new WebSocket(this.service, 'xmpp');

    var that = this;
    this.socket.addEventListener('open', function() {
      if (this.protocol !== 'xmpp')
        ; //TODO: warning (Opera and Safari doesn't support this property)

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
  WebSocketTransport.prototype.send = function(aStanza) {
    this.emit('out', aStanza);
    this.socket.send(aStanza.toString());
  };
  Lightstring.WebSocketTransport = WebSocketTransport;
})();