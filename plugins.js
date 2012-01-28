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

////////////
//Presence// http://xmpp.org/rfcs/rfc6121.html#presence
////////////
Lightstring.stanza.presence = function(aPriority) {
  if(aPriority)
    return "<presence><priority>"+aPriority+"</priority></presence>";
  else
    return "<presence/>";
};
Lightstring.presence = function(aConnection, aPriority) {
  aConnection.send(Lightstring.stanza.presence(aPriority));
};

//////////
//Roster//
//////////
Lightstring.NS.roster = 'jabber:iq:roster';
Lightstring.stanza.roster = {
	'get': function() {
		return "<iq type='get'><query xmlns='"+Lightstring.NS.roster+"'/></iq>";
	},
	add: function(aAddress, aGroups, aCustomName) {
		var iq = $iq({type: 'set'}).c('query', {xmlns: Lightstring.NS.roster}).c('item', {jid: aAddress}).tree();
		if(aCustomName) iq.querySelector('item').setAttribute(aCustomName);
		for (var i=0; i<aGroups.length; i++) {
			if(i === 0) iq.querySelector('item').appendChild(document.createElement('group'));
			iq.querySelector('group').appendChild(document.createElement(aGroups[i]));
		}
		return iq;
	},
	remove: function(aAddress) {
		return $iq({type: 'set'}).c('query', {xmlns: Lightstring.NS.roster}).c('item', {jid: aAddress, subscription: 'remove'}).tree();
	}
};
Lightstring.getRoster = function(connection, aCallback) {
	connection.send(this.stanza.roster.get(), function(answer){
		var contacts = [];
		var elems = answer.querySelectorAll('item');
    for(var i = 0; i<elms.length; i++) {
      var item = elms[i];
      var jid = item.getAttribute('jid');
      var name = item.getAttribute('name');
      var groups = item.querySelectorAll('group');
      var subscription = item.getAttribute('subscription');
      var contact = {};
      if(name)
        contact.name = name;
      if(jid)
        contact.jid = jid;
      if(subscription)
        contact.subscription = subscription;
      if(groups.length > 0) {
        contact.groups = [];
        groups.forEach(function(group) {
          contact.groups.push(group.textContent);
        });
      }

      contacts.push(contact);
		};
		aCallback(contacts);
	});
}
/////////
//vCard//
/////////
Lightstring.NS.vcard = 'vcard-temp';
Lightstring.stanza.vcard = {
	'get': function(aTo) {
		if(aTo)
			return "<iq type='get' to='"+aTo+"'><vCard xmlns='"+Lightstring.NS.vcard+"'/></iq>";
		else
			return "<iq type='get'><vCard xmlns='"+Lightstring.NS.vcard+"'/></iq>";
	}
};
//FIXME we should return a proper vcard, not an XMPP one
Lightstring.getVcard = function(aConnection, aTo, aCallback) {
	aConnection.send(Lightstring.stanza.vcard.get(aTo), function(answer, err){
		if(answer) {
			var vcard = answer.querySelector('vCard');
			if(vcard)
				aCallback(vcard);
		}		
		else
			aCallback(null);
	});
}
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
	aConnection.send(Lightstring.stanza.disco.items(aTo), function(answer){
		var items = [];
    var elms = answer.querySelectorAll('item');
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
	aConnection.send(Lightstring.stanza.disco.info(aTo, aNode), function(answer){
		var field = answer.querySelector('field[var="pubsub#creator"] > value');
		var creator = field ? field.textContent : '';
		//FIXME callback the entire data
		aCallback(creator);
	});
};
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
	config: function(aTo, aNode, aFields) {
		var iq = "<iq type='set' to='"+aTo+"'><pubsub xmlns='"+Lightstring.NS.pubsub+"'><configure node='"+aNode+"'><x xmlns='"+Lightstring.NS.x+"' type='submit'>";
		if(aFields) {
			aFields.forEach(function(field) {
				iq += field;
			});
		}
		iq += "</x></configure></pubsub></iq>";
		return iq;
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
	aConnection.send(Lightstring.stanza.pubsub.items(aTo, aNode), function(answer){
		var items = [];
    var elms = answer.querySelectorAll('item');
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
	aConnection.send(Lightstring.stanza.pubsub.create(aTo, aNode, aFields), function(answer) {
		if(answer.getAttribute('type') === 'result')
			aCallback(null, answer);
		else
			aCallback(answer, null);
	});
};
Lightstring.pubsubConfig = function(aConnection, aTo, aNode, aCallback) {
	aConnection.send(Lightstring.stanza.pubsub.getConfig(aTo, aNode), function(answer){
		var accessmodel = answer.querySelector('field[var="pubsub#access_model"]').lastChild.textContent;
		if(accessmodel)
			aCallback(accessmodel);
		else
			aCallback(null);
	});
}
Lightstring.pubsubRetract = function(aConnection, aTo, aNode, aItem, aCallback) {
	aConnection.send(Lightstring.stanza.pubsub.retract(aTo, aNode, aItem), function(answer){
		if(aCallback)
			aCallback(answer);
	});
}
Lightstring.pubsubPublish = function(aConnection, aTo, aNode, aItem, aId, aCallback) {
	aConnection.send(Lightstring.stanza.pubsub.publish(aTo, aNode, aItem, aId), function(answer){
		if(answer.getAttribute('type') === 'result')
			aCallback(null, answer);
		else
			aCallback(answer, null);
	});
}
Lightstring.pubsubDelete = function(aConnection, aTo, aNode, aCallback) {
	aConnection.send(Lightstring.stanza.pubsub.delete(aTo, aNode), function(answer){
		if(aCallback)
			aCallback(answer);
	});
}
Lightstring.pubsubGetAffiliations = function(aConnection, aTo, aNode, aCallback) {
	aConnection.send(Lightstring.stanza.pubsub.affiliations(aTo, aNode), function(answer) {
		if((answer.getAttribute('type') === 'result') && aCallback) {
			var affiliations = {};
			answer.querySelectorAll('affiliation').forEach(function(affiliation) {
				affiliations[affiliation.getAttribute("jid")] = affiliation.getAttribute("affiliation");
			})
			aCallback(affiliations);
		}
	});
};
Lightstring.pubsubSetAffiliations = function(aConnection, aTo, aNode, aAffiliations, aCallback) {
	aConnection.send(Lightstring.stanza.pubsub.setAffiliations(aTo, aNode, aAffiliations));
};
//////
//IM//
//////
Lightstring.stanza.message = {
	normal: function(aTo, aSubject, aText) {
		return "<message type='normal' to='"+aTo+"'><subject>"+aSubject+"</subject><body>"+aText+"</body></message>";
	},
	chat: function(aTo, aText) {
		return "<message type='chat' to='"+aTo+"'><body>"+aText+"</body></message>";
	}
};

