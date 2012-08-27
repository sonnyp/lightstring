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
(function() {
  var identities = [{category: 'client', type: 'browser'}];
  var features = [];

  Lightstring.plugins['disco'] = {
    namespaces: {
      'disco#info': "http://jabber.org/protocol/disco#info",
      'disco#items': "http://jabber.org/protocol/disco#items"
    },
    stanzas: {
      items: function(aTo, aNode) {
        if(aTo)
          var iq = "<iq type='get' to='" + aTo + "'>";
        else
          var iq = "<iq type='get'>";

        if(aNode)
          var query = "<query xmlns='" + Lightstring.ns['disco#items'] + "' node='" + aNode + "'/>";
        else
          var query = "<query xmlns='" + Lightstring.ns['disco#items'] + "'/>";

        return iq + query + "</iq>";
      },
      info: function(aTo, aNode) {
        if(aTo)
          var iq = "<iq type='get' to='" + aTo + "'>";
        else
          var iq = "<iq type='get'>";
        if(aNode)
          var query = "<query xmlns='" + Lightstring.ns['disco#info'] + "' node='" + aNode + "'/>";
        else
          var query = "<query xmlns='" + Lightstring.ns['disco#info'] + "'/>";

        return iq + query + "</iq>";
      }
    },
    methods: {
      items: function(aTo, aResult, aError) {
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
              node: node.getAttributeNS(null, 'node') || ''
            };
            items.push(item);
          }

          stanza.items = items;

          if (aResult)
            aResult(stanza);
        }, aError);
      },
      info: function(aTo, aNode, aResult, aError) {
        this.send(Lightstring.stanzas.disco.info(aTo, aNode), function(stanza) {
          var identities = [];
          var features = [];
          var fields = {};

          var children = stanza.DOM.firstChild.childNodes;
          var length = children.length;

          for (var i = 0; i < length; i++) {
            var child = children[i];
            var ns = child.namespaceURI;
            var name = child.localName;

            if (ns === Lightstring.ns['disco#info'] && name === 'feature')
              features.push(child.getAttributeNS(null, 'var'));

            else if (ns === Lightstring.ns['disco#info'] && name === 'identity') {
              var identity = {
                category: child.getAttributeNS(null, 'category'),
                type: child.getAttributeNS(null, 'type')
              };
              var name = child.getAttributeNS(null, 'name');
              if (name)
                identity.name = name;
              identities.push(identity);
            }
            else if (ns === Lightstring.ns['dataforms'] && name === 'x')
              var fields = this.dataforms.parse(child); //TODO: check if that plugin is enabled.

            else
              ; //TODO: emit a warning.
          }

          stanza.identities = identities;
          stanza.features = features;
          stanza.fields = fields;

          if (aResult)
            aResult(stanza);
        }, aError);
      },
      addFeatures: function() {
        for (var i = 0; i < arguments.length; i++)
          features.push(arguments[i]);
      }
    },
    init: function() {
      this.on('iq/' + Lightstring.ns['disco#info'] + ':query', function(stanza) {
        if (stanza.DOM.getAttributeNS(null, 'type') !== 'get')
          return false;

        var query = stanza.DOM.firstChild;
        if (query.getAttributeNS(null, 'node')) {
          var response = "<iq to='" + stanza.DOM.getAttributeNS(null, 'from') + "'" +
                            " id='" + stanza.DOM.getAttributeNS(null, 'id') + "'" +
                            " type='error'/>"; //TODO: precise the error.
          this.send(response);
          return true;
        }

        var res = "<iq to='" + stanza.DOM.getAttributeNS(null, 'from') + "'" +
                     " id='" + stanza.DOM.getAttributeNS(null, 'id') + "'" +
                     " type='result'>" +
                    "<query xmlns='" + Lightstring.ns['disco#info'] + "'>";

        identities.forEach(function(i) {
          res += "<identity";
          if (i.category)
            res += " category='" + i.category + "'";
          if (i.name)
            res += " name='" + i.name + "'";
          if (i.type)
            res += " type='" + i.type + "'";
          res += "/>";
        });

        features.forEach(function(f) {
          res += "<feature var='" + f + "'/>";
        });

        res += "</query>" +
             "</iq>";

        this.send(res);
        return true;
      });
    }
  };

Object.defineProperties(Lightstring.Stanza.prototype, {
  'queryDiscoInfo': {
    get : function() {
      var query = this.el.querySelector('query');
      if (query && (query.getAttribute('xmlns') === Lightstring.ns['disco#info'])
        return true;
    },
    set: function(aBool) {
      var queryEl = Lightstring.doc.createElementNS(Lightstring.ns['disco#info'], 'query');
      this.el.appendChild(queryEl);
    },
    enumerable : true,  
    configurable : true
  },
});

Object.defineProperties(Lightstring.Stanza.prototype, {
  'infos': {
    get : function() {
      var query = this.el.querySelector('query');
      if (!query || (query.getAttribute('xmlns') !== 'http://jabber.org/protocol/disco#info')
        return false;

      var info = {};
      for (var i = 0, length = query.childNodes.length; i < length; i++) {
        var child = query.childNodes[i];
        if (info[child.tagName] === 'identity') {
          info.identity = {};
          console.log(child.attributes)
        }


      }
    },
    set: function(aBool) {
      if (this.ping)
        return;

      var pingEl = Lightstring.doc.createElementNS(Lightstring.ns.ping, 'ping');
      this.el.appendChild(pingEl);
    },
    enumerable : true,  
    configurable : true
  },
});

})();
