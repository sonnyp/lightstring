'use strict';

(function() {
  Lightstring.BOSHConnection = function(aService) {
    this.service = aService;
    this.rid = 1337;
    this.currentRequests = 0;
    this.maxHTTPRetries = 5;
    this.maxRequests = 2;
    this.queue = [];
  };
  Lightstring.BOSHConnection.prototype = new EventEmitter();
  Lightstring.BOSHConnection.prototype.open = function() {
    var that = this;

    var attrs = {
      wait: '60',
      hold: '1',
      to: 'yuilop',
      content: 'text/xml; charset=utf-8',
      ver: '1.6',
      'xmpp:version': '1.0',
      'xmlns:xmpp': 'urn:xmpp:xbosh',
    };

    this.request(attrs, null, function(data) {
      that.emit('open');
      that.sid = data.getAttribute('sid');
      that.maxRequests = data.getAttribute('maxRequests') || that.maxRequests;
    });


    this.on('in', function(stanza) {
      if (stanza.localName === 'success') {
        that.request({
          'xmpp:restart': 'true',
          'xmlns:xmpp': 'urn:xmpp:xbosh'
        })
      }
    })
  };
  Lightstring.BOSHConnection.prototype.request = function(attrs, children, aOnSuccess, aOnError, aRetry) {
    // if (children && children[0] && children[0].name === 'body') {
    //   var body = children[0];
    // }
    // else {
    //   var body = new ltx.Element('body');
    //   if (children) {
    //     if(util.isArray(children))
    //       for (var k in children)
    //         body.cnode(children[k]);
    //     else
    //       body.cnode(children);
    //   }
    // }

    var body = '<body rid="' + this.rid++ + '"  xmlns="http://jabber.org/protocol/httpbind"/>';
    var body = Lightstring.XML2DOM(body);

    //sid
    if (this.sid)
      body.setAttribute('sid', this.sid);

    //attributes on body
    for (var i in attrs)
      body.setAttribute(i, attrs[i]);

    //children
    for (var i in children)
      body.appendChild(children[i]);



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
    // req.responseType = 'document';
    req.addEventListener("load", function() {
      if (req.status < 200 || req.status >= 400) {
        that.emit('error', "HTTP status " + req.status);
        that.emit('close');
        return;
      }
      that.currentRequests--;

      var body = this.response;
      that.emit('rawin', body);
      var bodyEl = Lightstring.XML2DOM(body);
      that.processResponse(bodyEl)
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

    for(var i = 0; i < body.children.length; i++) {
      var child = body.children[i];
      that.emit('out', child);
    }
    this.emit('rawout', Lightstring.DOM2XML(body))

    req.send(Lightstring.DOM2XML(body));
    this.currentRequests++;
  };
  Lightstring.BOSHConnection.prototype.send = function(aData) {
    if (!aData) {
      var el = '';
    }

    else if(typeof aData == 'string') {
      try {
        var el = Lightstring.XML2DOM(aData);
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
  Lightstring.BOSHConnection.prototype.end = function(stanzas) {
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
  Lightstring.BOSHConnection.prototype.processResponse = function(bodyEl) {
    if (bodyEl && bodyEl.children) {
      for(var i = 0; i < bodyEl.children.length; i++) {
        var child = bodyEl.children[i];
        this.emit('in', child);
      }
    }
    if (bodyEl && bodyEl.getAttribute('type') === 'terminate') {
      var condition = bodyEl.getAttribute('condition');
      this.emit('error',
        new Error(condition || "Session terminated"));
      this.emit('close');
    }
  };
  Lightstring.BOSHConnection.prototype.mayRequest = function() {
    var canRequest =
      this.sid && (this.currentRequests === 0 || ((this.queue.length > 0 && this.currentRequests < this.maxRequests))
    );

    if (!canRequest)
      return;

    var stanzas = this.queue;
    this.queue = [];
    //~ this.rid++;

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
        that.emit('error', error);
        that.emit('close');
        delete that.sid;
      }
    );
  };
})();