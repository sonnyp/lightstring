'use strict';

(function() {

function log(msg) {
  var logEl = document.createElement('div');
  logEl.textContent = msg;
  document.getElementById('log').appendChild(logEl);
}

document.addEventListener('DOMContentLoaded', function() {
  var xmpp = new Lightstring.Connection('ws://localhost:5280');
  xmpp.load('DIGEST-MD5', 'presence', 'im');

  xmpp.on('connecting', function(stanza) {
    log('connecting')
  });

  xmpp.on('message', function(stanza) {
    var body = stanza.getChild('body');
    if (body) {
      body = body.text();
      log(stanza.attrs.from + ' : ' + body);
      var reply = Lightstring.stanzas.im.chat(stanza.attrs.from, body);
      xmpp.send(reply);
    }
  });

  xmpp.on('connected', function(stanza) {
    log('connected');
    xmpp.presence.send();
  });

  var oldEmit = xmpp.emit;
  xmpp.emit = function() {
    console.log(arguments);
    oldEmit.apply(xmpp, arguments);
  }

  document.querySelector('form').addEventListener('submit', function(e) {
    e.preventDefault();
    var jid = this.elements['jid'].value;
    var pass = this.elements['pass'].value;
    xmpp.connect(jid, pass);
  });
});

})();