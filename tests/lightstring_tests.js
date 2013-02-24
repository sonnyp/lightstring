describe('Lightstring', function(){
  describe('Connection', function(){
    var conn;

    beforeEach(function() {
      conn = new Lightstring.Connection('ws://example.com');
    });

    it('should be an EventEmitter instance', function(){
      expect(conn.on).to.be.a('function');
    });

    describe('connect', function() {

      it('should emit a connecting event', function(done) {
        conn.onTransportLoaded = function() {};

        conn.on('connecting', function() {
          done();
        });

        conn.connect('john@example.com', 'pwd');
      });

      it('should attach the transport', function(done) {
        conn.onTransportLoaded = function() {
          expect(this.transport).to.be.a(Lightstring.WebSocketTransport);
          done();
        };

        conn.connect('john@example.com', 'pwd');
      });
    });

    describe('send', function() {
      it('should delegate to transport', function(done) {
        conn.onTransportLoaded = function() {
            this.transport.send = function() {
                done();
            };

            conn.send('something');
        };

        conn.connect('john@example.com', 'pwd');
      });

      it('should attach callbacks to an IQ result', function(done) {
        var success   = function() {};
        var error     = function() {};
        var callbacks = {success: success, error: error};

        conn.onTransportLoaded = function() {
            this.transport.send = function() {
                expect(conn.callbacks["123"]).to.eql(callbacks);
                done();
            };

            var stanza = new Element('iq', {id: "123", type: "get"});
            conn.send(stanza, success, error);
        };

        conn.connect('john@example.com', 'pwd');
      });
    });

  });
});

