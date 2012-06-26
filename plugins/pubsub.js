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
(function() {
  var event_tags = ['collection', 'configuration', 'delete', 'items', 'purge', 'subscription'];

  Lightstring.plugins['pubsub'] = {
    namespaces: {
      x: "jabber:x:data", //XXX
      pubsub: "http://jabber.org/protocol/pubsub",
      pubsub_owner: "http://jabber.org/protocol/pubsub#owner",
      pubsub_event: "http://jabber.org/protocol/pubsub#event",
      pubsub_error: "http://jabber.org/protocol/pubsub#error"
    },
    stanzas: {
      getConfig: function(aTo, aNode) {
        return  "<iq type='get' to='" + aTo + "'><pubsub xmlns='" + Lightstring.ns.pubsub_owner + "'><configure node='" + aNode + "'/></pubsub></iq>";
      },
      items: function(aTo, aNode, aItems) {
        var stanza =  "<iq type='get' to='" + aTo + "'><pubsub xmlns='" + Lightstring.ns.pubsub + "'><items node='" + aNode + "'>";
        if (aItems) {
          aItems.forEach(function(item) {
            stanza += "<item id='" + item + "'/>"
          });
        }
        return stanza + "</items></pubsub></iq>";
      },
      affiliations: function(aTo, aNode) {
        return(
          "<iq type='get' to='" + aTo + "'>" +
            "<pubsub xmlns='" + Lightstring.ns.pubsub_owner + "'>" +
              "<affiliations node='" + aNode + "'/>" +
            "</pubsub>" +
          "</iq>"
        );
      },
      publish: function(aTo, aNode, aItem, aId) {
        return  "<iq type='set' to='" + aTo + "'><pubsub xmlns='" + Lightstring.ns.pubsub + "'><publish node='" + aNode + "'><item id='" + aId + "'>" + aItem + "</item></publish></pubsub></iq>";
      },
      retract: function(aTo, aNode, aItem) {
        return  "<iq type='set' to='" + aTo + "'><pubsub xmlns='" + Lightstring.ns.pubsub + "'><retract node='" + aNode + "'><item id='" + aItem + "'/></retract></pubsub></iq>";
      },
      delete: function(aTo, aNode) {
        return  "<iq type='set' to='" + aTo + "'><pubsub xmlns='" + Lightstring.ns.pubsub_owner + "'><delete node='" + aNode + "'/></pubsub></iq>";
      },
      purge: function(aTo, aNode) {
        return  "<iq type='set' to='" + aTo + "'><pubsub xmlns='" + Lightstring.ns.pubsub_owner + "'><purge node='" + aNode + "'/></pubsub></iq>";
      },
      create: function(aTo, aNode, aFields) {
        var iq = "<iq type='set' to='" + aTo + "'><pubsub xmlns='" + Lightstring.ns.pubsub + "'><create node='" + aNode + "'/>";
        if (aFields) {
          iq += "<configure><x xmlns='" + Lightstring.ns.x + "' type='submit'>"
          aFields.forEach(function(field) {
            iq += field;
          });
          iq += "</x></configure>";
        }
        iq += "</pubsub></iq>";
        return iq;
      },
      setConfig: function(aTo, aNode, aFields) {
        var iq = "<iq type='set' to='" + aTo + "'><pubsub xmlns='" + Lightstring.ns.pubsub_owner + "'><configure node='" + aNode + "'><x xmlns='" + Lightstring.ns.x + "' type='submit'>";
        aFields.forEach(function(field) {
          iq += field;
        });
        iq += "</x></configure></pubsub></iq>";
        return iq;
      },
      setAffiliations: function(aTo, aNode, aAffiliations) {
        var iq = "<iq type='set' to='" + aTo + "'><pubsub xmlns='" + Lightstring.ns.pubsub_owner + "'><affiliations node='" + aNode + "'>";
        for (var i = 0; i < aAffiliations.length; i++)
          iq += "<affiliation jid='" + aAffiliations[i][0] + "' affiliation='" + aAffiliations[i][1] + "'/>";
        iq += "</affiliations></pubsub></iq>";
        return iq;
      },
    },
    methods: {
      items: function(aTo, aNode, aItems, aOnSuccess, aOnError) {
        this.send(Lightstring.stanzas.pubsub.items(aTo, aNode, aItems), function(stanza) {
          var items = stanza.DOM.querySelectorAll('item') || [];
          stanza.items = items;
          if (aOnSuccess)
            aOnSuccess(stanza);
        }, aOnError);
      },
      create: function(aTo, aNode, aFields, aResult, aError) {
        this.send(Lightstring.stanzas.pubsub.create(aTo, aNode, aFields), aResult, aError);
      },
      configure: function(aTo, aNode, aFields, aResult, aError) {
        this.send(Lightstring.stanzas.pubsub.setConfig(aTo, aNode, aFields), aResult, aError);
      },
      config: function(aTo, aNode, aResult, aError) {
        this.send(Lightstring.stanzas.pubsub.getConfig(aTo, aNode), function(stanza) {
          //FIXME: wtf?
          var accessmodel = stanza.DOM.querySelector('field[var="pubsub#access_model"]').lastChild.textContent;
          if(accessmodel)
            aResult, aError(accessmodel);
          else
            aResult, aError(null);
        });
      },
      retract: function(aTo, aNode, aItem, aResult, aError) {
        this.send(Lightstring.stanzas.pubsub.retract(aTo, aNode, aItem), aResult, aError);
      },
      publish: function(aTo, aNode, aItem, aId, aResult, aError) {
        this.send(Lightstring.stanzas.pubsub.publish(aTo, aNode, aItem, aId), aResult, aError);
      },
      delete: function(aTo, aNode, aResult, aError) {
        this.send(Lightstring.stanzas.pubsub.delete(aTo, aNode), aResult, aError);
      },
      purge: function(aTo, aNode, aResult, aError) {
        this.send(Lightstring.stanzas.pubsub.purge(aTo, aNode), aResult, aError);
      },
      getAffiliations: function(aTo, aNode, aResult, aError) {
        this.send(Lightstring.stanzas.pubsub.affiliations(aTo, aNode), function(stanza) {
          if((stanza.DOM.getAttribute('type') === 'result') && aResult, aError) {
            var affiliations = {};
            stanza.DOM.querySelectorAll('affiliation').forEach(function(affiliation) {
              affiliations[affiliation.getAttribute("jid")] = affiliation.getAttribute("affiliation");
            })
            if (aResult)
              aResult(affiliations);
          }
        }, aError);
      },
      setAffiliations: function(aTo, aNode, aAffiliations, aResult, aError) {
        this.send(Lightstring.stanzas.pubsub.setAffiliations(aTo, aNode, aAffiliations), aResult, aError);
      }
    },
    init: function() {
      //TODO: find a way to put that in handlers, it’s UGLY!
      this.on('in-message-*-' + Lightstring.ns['pubsub_event'] + ':event', function(stanza) {
        var payload = stanza.firstChild.firstChild; //XXX
        if (payload.namespaceURI !== Lightstring.namespaces['pubsub_event'])
          return; //TODO: emit something.

        var name = payload.localName;
        if (event_tags.indexOf(name) === -1)
          return; //TODO: emit something.

        this.emit('pubsub:' + name);
      });
    }
  };
})();
