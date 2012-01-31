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
Lightstring.plugins['disco'] = {
  namespaces: {
    'disco#info': "http://jabber.org/protocol/disco#info",
    'disco#items': "http://jabber.org/protocol/disco#items"
  },
  stanzas: {
    'disco#info': function(aTo, aNode) {
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
    'disco#info': function(aTo, aNode) {
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
  },
  handlers: {
    //TODO: fix that handler.
    /*conn.on('iq/' + Lightstring.NS['disco#info'] + ':query', function(stanza) {
      if (stanza.DOM.getAttributeNS(null, 'type') !== 'get')
        return;

      var query = stanza.DOM.firstChild;
      if (query.getAttributeNS(null, 'node')) {
        var response = "<iq to='" + stanza.DOM.getAttributeNS(null, 'from') + "'" +
                          " id='" + stanza.DOM.getAttributeNS(null, 'id') + "'" +
                          " type='error'/>"; //TODO: precise the error.
        conn.send(response);
        return;
      }

      var features = [Lightstring.NS.sxe, Lightstring.NS.jingle.transports.sxe]; //TODO: put that elsewhere.

      var response = "<iq to='" + stanza.DOM.getAttributeNS(null, 'from') + "'" +
                        " id='" + stanza.DOM.getAttributeNS(null, 'id') + "'" +
                        " type='result'>" +
                       "<query xmlns='" + Lightstring.NS['disco#info'] + "'>" +
                         "<identity category='client' type='browser'/>";
      features.forEach(function(f) {
        response += "<feature var='" + f + "'/>";
      });
      response += "</query>" +
                "</iq>";

      conn.send(response);
    });*/
  },
  methods: {
    discoItems: function(aTo, aResult, aError) {
      this.send(Lightstring.stanzas.disco.items(aTo), function (stanza) {
        var items = [];

        var children = stanza.DOM.firstChild.childNodes;
        var length = children.length;

        for (var i = 0; i < length; i++) {
          var node = children[i];
          if (node.localName !== 'item')
            continue;

          var item = {
            jid: node.getAttributeNS(null, 'jid'),
            name: node.getAttributeNS(null, 'name'),
            node: node.getAttributeNS(null, 'node')
          };
          items.push(item);
        }

        stanza.items = items;

        if (aResult)
          aResult(stanza);
      }, aError);
    },
    discoInfo: function(aTo, aNode, aResult, aError) {
      this.send(Lightstring.stanzas.disco.info(aTo, aNode), function(stanza){
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
              if (label)
                field.label = label;

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

        stanza.identities = identities;
        stanza.features = features;
        stanza.fields = fields;

        if (aResult)
          aResult(stanza);
      }, aError);
    }
  }
};
