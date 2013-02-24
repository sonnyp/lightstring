describe('Lightstring', function() {
  describe('Stanza', function() {
    var element = new Element('iq', {id: '123', type: 'get'})
      .c('query', {xmlns: 'lightstring:test'}).up();

    it('should create a stanza from a string', function() {
      var stanza = new Lightstring.Stanza(element.toString());

      expect(stanza.name).to.be('iq');
      expect(stanza.attrs.type).to.be('get');
      expect(stanza.attrs.id).to.be('123');
      expect(stanza.getChild('query')).to.be.a(Element);
      expect(stanza).to.be.a(Lightstring.Stanza);
    });

    it('should create a stanza from an Element', function() {
      var stanza = new Lightstring.Stanza(element);

      expect(stanza.name).to.be('iq');
      expect(stanza.attrs.type).to.be('get');
      expect(stanza.attrs.id).to.be('123');
      expect(stanza.getChild('query')).to.be.a(Element);
      expect(stanza).to.be.a(Lightstring.Stanza);
    });

    it('should return a stanza if provided a stanza', function() {
      var stanza = new Lightstring.Stanza(element);
      expect(new Lightstring.Stanza(stanza)).to.be(stanza);
    });
  });
});