'use strict';

(function() {

  var BOSHTransport = function(aService, aJID) {
    this.service = aService;
    this.rid = 1337;
    this.jid = aJID;
    this.currentRequests = 0;
    this.maxHTTPRetries = 5;
    this.maxRequests = 2;
    this.queue = [];
  };
  BOSHTransport.prototype = new EventEmitter();
  BOSHTransport.prototype.open = function() {
    var that = this;

    var attrs = {
      wait: '60',
      hold: '1',
      to: this.jid.domain,
      content: 'text/xml; charset=utf-8',
      ver: '1.6',
      'xmpp:version': '1.0',
      'xmlns:xmpp': 'urn:xmpp:xbosh',
    };

    this.request(attrs, [], function(data) {
      that.emit('open');
      that.sid = data.getAttribute('sid');
      that.maxRequests = data.getAttribute('maxRequests') || that.maxRequests;
      if (!data.getElementsByTagNameNS('http://etherx.jabber.org/streams', 'features')[0]) {
        that.request();
      }
    });


    this.on('in', function(stanza) {
      if (stanza.name === 'success') {
        that.request({
          'to': that.jid.domain,
          'xmpp:restart': 'true',
          'xmlns:xmpp': 'urn:xmpp:xbosh'
        })
      }
    })
  };
  BOSHTransport.prototype.request = function(attrs, children, aOnSuccess, aOnError, aRetry) {
    if (!children)
      children = [];

    var body = Lightstring.doc.createElement('body');
    body.setAttribute('rid', this.rid++);
    body.setAttribute('xmlns', 'http://jabber.org/protocol/httpbind');

    //sid
    if (this.sid)
      body.setAttribute('sid', this.sid);

    //attributes on body
    for (var i in attrs)
      body.setAttribute(i, attrs[i]);

    //children
    for (var i = 0, length = children.length; i < length; i++) {
      body.appendChild(children[i]);
    };

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
    req.addEventListener("load", function() {
      if (req.status < 200 || req.status >= 400) {
        that.emit('error', "HTTP status " + req.status);
        that.emit('close');
        return;
      }
      that.currentRequests--;

      var body = this.response;
      that.emit('rawin', body);
      var bodyEl = Lightstring.parse(body);
      that.processResponse(bodyEl);
      if (aOnSuccess)
        aOnSuccess(bodyEl);

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
    if (body.childNodes) {
      for(var i = 0; i < body.childNodes.length; i++) {
        var child = body.childNodes[i];
        that.emit('out', new Lightstring.Stanza(child));
      }
    }

    var bodyStr = Lightstring.serialize(body);

    this.emit('rawout', bodyStr);

    req.send(bodyStr);
    this.currentRequests++;
  };
  BOSHTransport.prototype.send = function(aData) {
    if (!aData) {
      var el = '';
    }

    else if(typeof aData == 'string') {
      try {
        var el = Lightstring.parse(aData);
      }
      catch(e) {
        console.log(e);
        console.log(aData);
      }
    }
    else {
      var el = aData.root();
    }

    var that = this;

    this.queue.push(el);

    setTimeout(this.mayRequest.bind(this), 0)

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
    var children = bodyEl.childNodes
    if (children.length) {
      for(var i = 0; i < children.length; i++) {
        var child = children[i];
        var stanza = new Lightstring.Stanza(child);
        this.emit('in', stanza);
      }
    }
    else if (bodyEl.getAttribute('type') === 'terminate') {
      var condition = bodyEl.getAttribute('condition');
      this.emit('error',
        new Error(condition || "Session terminated"));
      this.emit('close');
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
        that.emit('error', error);
        that.emit('close');
        delete that.sid;
      }
    );
  };
  Lightstring.BOSHTransport = BOSHTransport;
})();