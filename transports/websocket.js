'use strict';

(function() {
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
   * @function Send data
   * @param {String} aData The data
   */
  WebSocketTransport.prototype.send = function(aData) {
    var data = aData.toString();

    this.socket.send(data);
    this.onOut(data);
    this.onRawOut(data);
  };

  Lightstring.WebSocketTransport = WebSocketTransport;
})();