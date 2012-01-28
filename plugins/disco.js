'use strict';

/**
  Copyright (c) 2011, Sonny Piers <sonny at fastmail dot net>

  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted, provided that the above
  copyright notice and this permission notice appear in all copies.

  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
  WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
  MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
  ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
  WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
  ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
  OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

/////////
//Disco//
/////////
Lightstring.NS['disco#info'] = "http://jabber.org/protocol/disco#info";
Lightstring.NS['disco#items'] = "http://jabber.org/protocol/disco#items";
Lightstring.stanza.disco = {
  items: function(aTo, aNode) {
    if(aTo)
      var iq = "<iq type='get' to='"+aTo+"'>";
    else
      var iq = "<iq type='get'>";
    
    if(aNode)
      var query = "<query xmlns='"+Lightstring.NS['disco#items']+"' node='"+aNode+"'/>";
    else
      var query = "<query xmlns='"+Lightstring.NS['disco#items']+"'/>";
      
    return iq+query+"</iq>";
  },
  info: function(aTo, aNode) {
    if(aTo)
      var iq = "<iq type='get' to='"+aTo+"'>";
    else
      var iq = "<iq type='get'>";
    if(aNode)
      var query = "<query xmlns='"+Lightstring.NS['disco#info']+"' node='"+aNode+"'/>";
    else
      var query = "<query xmlns='"+Lightstring.NS['disco#info']+"'/>";
      
    return iq+query+"</iq>";
  }
};
Lightstring.discoItems = function(aConnection, aTo, aCallback) {
  aConnection.send(Lightstring.stanza.disco.items(aTo), function(stanza){
    var items = [];
    var elms = stanza.DOM.querySelectorAll('item');
    for(var i = 0; i < elms.length; i++) {
      var node = elms[i];
      var item = {
        jid: node.getAttribute('jid'),
        name: node.getAttribute('name'),
        node: node.getAttribute('node')
      }
      items.push(item);
    };
    if(aCallback)
      aCallback(items);
  });
};
Lightstring.discoInfo = function(aConnection, aTo, aNode, aCallback) {
  aConnection.send(Lightstring.stanza.disco.info(aTo, aNode), function(stanza){
    var identities = [];
    var features = [];

    var children = stanza.DOM.firstChild.children;
    var length = children.length;

    for (var i = 0; i < length; i++) {
      var child = children[i];

      if (child.localName === 'feature')
        features.push(child.getAttributeNS(null, 'var'));

      else if (child.localName === 'identity') {
        var identity = {
          category: child.getAttributeNS(null, 'category'),
          type: child.getAttributeNS(null, 'type')
        };
        var name = child.getAttributeNS(null, 'name');
        if (name)
          identity.name = name;
        identities.push(identity);
      }
    }

    aCallback({identities: identities, features: features});
  });
};
