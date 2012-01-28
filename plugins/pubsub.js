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

//////////
//PubSub//
//////////
Lightstring.NS.x = "jabber:x:data";
Lightstring.NS.pubsub = "http://jabber.org/protocol/pubsub";
Lightstring.NS.pubsub_owner = "http://jabber.org/protocol/pubsub#owner";
Lightstring.stanza.pubsub = {
  getConfig: function(aTo, aNode) {
    return  "<iq type='get' to='"+aTo+"'><pubsub xmlns='"+Lightstring.NS.pubsub_owner+"'><configure node='"+aNode+"'/></pubsub></iq>";
  },
  items: function(aTo, aNode) {
    return  "<iq type='get' to='"+aTo+"'><pubsub xmlns='"+Lightstring.NS.pubsub+"'><items node='"+aNode+"'/></pubsub></iq>";
  },
  affiliations: function(aTo, aNode) {
    return "<iq type='get' to='"+aTo+"'><pubsub xmlns='"+Lightstring.NS.pubsub_owner+"'><affiliations node='"+aNode+"'/></pubsub></iq>";
  },
  publish: function(aTo, aNode, aItem, aId) {
    return  "<iq type='set' to='"+aTo+"'><pubsub xmlns='"+Lightstring.NS.pubsub+"'><publish node='"+aNode+"'><item id='"+aId+"'>"+aItem+"</item></publish></pubsub></iq>";
  },
  retract: function(aTo, aNode, aItem) {
    return  "<iq type='set' to='"+aTo+"'><pubsub xmlns='"+Lightstring.NS.pubsub+"'><retract node='"+aNode+"'><item id='"+aItem+"'/></retract></pubsub></iq>";
  },
  'delete': function(aTo, aNode, aURI) {
    return  "<iq type='set' to='"+aTo+"'><pubsub xmlns='"+Lightstring.NS.pubsub_owner+"'><delete node='"+aNode+"'/></pubsub></iq>";
  },
  create: function(aTo, aNode, aFields) {
    var iq = "<iq type='set' to='"+aTo+"'><pubsub xmlns='"+Lightstring.NS.pubsub+"'><create node='"+aNode+"'/>";
    if(aFields) {
      iq += "<configure><x xmlns='"+Lightstring.NS.x+"' type='submit'>"
      aFields.forEach(function(field) {
        iq += field;
      });
      iq += "</x></configure>";
    }
    iq += "</pubsub></iq>";
    return iq;
  },
  setAffiliations: function(aTo, aNode, aAffiliations) {
    var iq = "<iq type='set' to='"+aTo+"'><pubsub xmlns='"+Lightstring.NS.pubsub_owner+"'><affiliations node='"+aNode+"'>";
    for(var i = 0; i < aAffiliations.length; i++) {
      iq += "<affiliation jid='"+aAffiliations[i][0]+"' affiliation='"+aAffiliations[i][1]+"'/>"
    }
    iq += "</affiliations></pubsub></iq>";
    return iq;
  },
};
Lightstring.pubsubItems = function(aConnection, aTo, aNode, aCallback) {
  aConnection.send(Lightstring.stanza.pubsub.items(aTo, aNode), function(stanza){
    var items = [];
    var elms = stanza.DOM.querySelectorAll('item');
    for(var i = 0; i < elms.length; i++) {
      var node = elms[i];
      var item = {
        id: node.getAttribute('id'),
        name: node.querySelector('title').textContent,
        src: node.querySelector('content').getAttribute('src'),
        type: node.querySelector('content').getAttribute('type'),
      }
      var miniature = node.querySelector('link');
      if(miniature)
        item.miniature = miniature.getAttribute('href');
      items.push(item);
    };
    if(aCallback)
      aCallback(items);
  });
}
Lightstring.pubsubCreate = function(aConnection, aTo, aNode, aFields, aCallback) {
  aConnection.send(Lightstring.stanza.pubsub.create(aTo, aNode, aFields), function(stanza) {
    if(stanza.DOM.getAttribute('type') === 'result')
      aCallback(null, stanza);
    else
      aCallback(stanza, null);
  });
};
Lightstring.pubsubConfig = function(aConnection, aTo, aNode, aCallback) {
  aConnection.send(Lightstring.stanza.pubsub.getConfig(aTo, aNode), function(stanza){
    var accessmodel = stanza.DOM.querySelector('field[var="pubsub#access_model"]').lastChild.textContent;
    if(accessmodel)
      aCallback(accessmodel);
    else
      aCallback(null);
  });
}
Lightstring.pubsubRetract = function(aConnection, aTo, aNode, aItem, aCallback) {
  aConnection.send(Lightstring.stanza.pubsub.retract(aTo, aNode, aItem), function(stanza){
    if(aCallback)
      aCallback(stanza);
  });
}
Lightstring.pubsubPublish = function(aConnection, aTo, aNode, aItem, aId, aCallback) {
  aConnection.send(Lightstring.stanza.pubsub.publish(aTo, aNode, aItem, aId), function(stanza){
    if(answer.getAttribute('type') === 'result')
      aCallback(null, stanza);
    else
      aCallback(stanza, null);
  });
}
Lightstring.pubsubDelete = function(aConnection, aTo, aNode, aCallback) {
  aConnection.send(Lightstring.stanza.pubsub.delete(aTo, aNode), function(stanza){
    if(aCallback)
      aCallback(stanza);
  });
}
Lightstring.pubsubGetAffiliations = function(aConnection, aTo, aNode, aCallback) {
  aConnection.send(Lightstring.stanza.pubsub.affiliations(aTo, aNode), function(stanza) {
    if((stanza.DOM.getAttribute('type') === 'result') && aCallback) {
      var affiliations = {};
      stanza.DOM.querySelectorAll('affiliation').forEach(function(affiliation) {
        affiliations[affiliation.getAttribute("jid")] = affiliation.getAttribute("affiliation");
      })
      aCallback(affiliations);
    }
  });
};
Lightstring.pubsubSetAffiliations = function(aConnection, aTo, aNode, aAffiliations, aCallback) {
  aConnection.send(Lightstring.stanza.pubsub.setAffiliations(aTo, aNode, aAffiliations));
};
