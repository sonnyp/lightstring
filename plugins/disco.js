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
    var fields = {};

    var children = stanza.DOM.firstChild.childNodes;
    var length = children.length;

    for (var i = 0; i < length; i++) {

      if (children[i].localName === 'feature')
        features.push(children[i].getAttributeNS(null, 'var'));

      else if (children[i].localName === 'identity') {
        var identity = {
          category: children[i].getAttributeNS(null, 'category'),
          type: children[i].getAttributeNS(null, 'type')
        };
        var name = children[i].getAttributeNS(null, 'name');
        if (name)
          identity.name = name;
        identities.push(identity);
      }
      
      else if (children[i].localName === 'x') {
        for (var j = 0; j < children[i].childNodes.length; j++) {
          var child = children[i].childNodes[j];
          var field = {
            type: child.getAttribute('type')
          };

          var _var = child.getAttribute('var');

          var label = child.getAttribute('label');
          if(label) field.label = label;

          
          for (var y = 0; y < child.childNodes.length; y++) {
            if(child.childNodes[y].localName === 'desc')
              field.desc = child.childNodes[y].textContent;
            else if(child.childNodes[y].localName === 'required')
              field.required = true;
            else if(child.childNodes[y].localName === 'value')
              field.value = child.childNodes[y].textContent;
          }

          
          fields[_var] = field;
        }
      }
    }

    aCallback({'identities': identities, 'features': features, 'fields': fields}, stanza);
  });
};
