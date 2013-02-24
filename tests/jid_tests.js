describe('Lightstring', function() {
  describe('JID', function() {
    var jid;

    beforeEach(function() {
      jid = new Lightstring.JID('john.doe@example.com/resource');
    });

    it('should create a jid from a string', function() {
      expect(jid).to.be.a(Lightstring.JID);
      expect(jid.local).to.be('john.doe');
      expect(jid.domain).to.be('example.com');
      expect(jid.resource).to.be('resource');
    });

    it('should serialize a jid to string', function() {
      expect(jid.toString()).to.be('john.doe@example.com/resource');
    });

    it('should allow to get and set the bare jid', function() {
      expect(jid.bare).to.be('john.doe@example.com');
      jid.bare = 'john.smith@nowhere.com';
      expect(jid.toString()).to.be('john.smith@nowhere.com/resource');
    });

    it('should allow to get and set the full jid', function() {
      expect(jid.full).to.be('john.doe@example.com/resource');
      jid.full = 'john.smith@nowhere.com/other';
      expect(jid.full).to.be('john.smith@nowhere.com/other');
    });

    it('should transform a jid to a bare jid', function() {
      var bare = new Lightstring.JID('john.doe@example.com');

      expect(jid.toString()).to.be('john.doe@example.com/resource');
      expect(jid.toBare()).to.eql(bare);
      expect(jid.toString()).to.be('john.doe@example.com');
    });
  });
});