'use strict';

//
//Roster
//
Lighstring.NS.roster = 'jabber:iq:roster';
Lighstring.stanza.roster = {
	'get': function() {
		return "<iq type='get'><query xmlns='"+Mango.NS.roster+"'/></iq>";
	},
	add: function(aAddress, aGroups, aCustomName) {
		var iq = $iq({type: 'set'}).c('query', {xmlns: Mango.NS.roster}).c('item', {jid: aAddress}).tree();
		if(aCustomName) iq.querySelector('item').setAttribute(aCustomName);
		for (var i=0; i<aGroups.length; i++) {
			if(i === 0) iq.querySelector('item').appendChild(document.createElement('group'));
			iq.querySelector('group').appendChild(document.createElement(aGroups[i]));
		}
		return iq;
	},
	remove: function(aAddress) {
		return $iq({type: 'set'}).c('query', {xmlns: Mango.NS.roster}).c('item', {jid: aAddress, subscription: 'remove'}).tree();
	}
};
Lighstring.getRoster = function(connection, aCallback) {
	connection.send(this.stanza.roster.get(), function(answer){
		var contacts = [];
		answer.querySelectorAll('item').forEach(function(item) {
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
		});
		aCallback(contacts);
	});
}
//
//vCard
//
Lighstring.NS.vcard = 'vcard-temp';
Lighstring.stanza.vcard = {
	'get': function(aTo) {
		if(aTo)
			return "<iq type='get' to='"+aTo+"'><vCard xmlns='"+Mango.NS.vcard+"'/></iq>";
		else
			return "<iq type='get'><vCard xmlns='"+Mango.NS.vcard+"'/></iq>";
	}
};
//FIXME we should return a proper vcard, not an XMPP one
Lighstring.getVcard = function(aConnection, aTo, aCallback) {
	aConnection.send(Mango.stanza.vcard.get(aTo), function(answer, err){
		if(answer) {
			var vcard = answer.querySelector('vCard');
			if(vcard)
				aCallback(vcard);
		}		
		else
			aCallback(null);
	});
}
//
//Disco
//
Lighstring.NS['disco#info'] = "http://jabber.org/protocol/disco#info";
Lighstring.NS['disco#items'] = "http://jabber.org/protocol/disco#items";
Lighstring.stanza.disco = {
	items: function(aTo, aNode) {
		if(aTo)
			var iq = "<iq type='get' to='"+aTo+"'>";
		else
			var iq = "<iq type='get'>";
		
		if(aNode)
			var query = "<query xmlns='"+Mango.NS['disco#items']+"' node='"+aNode+"'/>";
		else
			var query = "<query xmlns='"+Mango.NS['disco#items']+"'/>";
			
		return iq+query+"</iq>";
	},
	info: function(aTo, aNode) {
		if(aTo)
			var iq = "<iq type='get' to='"+aTo+"'>";
		else
			var iq = "<iq type='get'>";
		if(aNode)
			var query = "<query xmlns='"+Mango.NS['disco#info']+"' node='"+aNode+"'/>";
		else
			var query = "<query xmlns='"+Mango.NS['disco#info']+"'/>";
			
		return iq+query+"</iq>";
	}
};
Lighstring.discoItems = function(aConnection, aTo, aCallback) {
	aConnection.send(Mango.stanza.disco.items(aTo), function(answer){
		var items = [];
		answer.querySelectorAll('item').forEach(function(node) {
			var item = {
				jid: node.getAttribute('jid'),
				name: node.getAttribute('name'),
				node: node.getAttribute('node')
			}
			items.push(item);
		});
		if(aCallback)
			aCallback(items);
	});
};
Lighstring.discoInfo = function(aConnection, aTo, aNode, aCallback) {
	aConnection.send(Mango.stanza.disco.info(aTo, aNode), function(answer){
		var field = answer.querySelector('field[var="pubsub#creator"] > value');
		var creator = field ? field.textContent : '';
		//FIXME callback the entire data
		aCallback(creator);
	});
};
//
//PubSub
//
Lighstring.NS.x = "jabber:x:data";
Lighstring.NS.pubsub = "http://jabber.org/protocol/pubsub";
Lighstring.NS.pubsub_owner = "http://jabber.org/protocol/pubsub#owner";
Lighstring.stanza.pubsub = {
	getConfig: function(aTo, aNode) {
		return  "<iq type='get' to='"+aTo+"'><pubsub xmlns='"+Mango.NS.pubsub_owner+"'><configure node='"+aNode+"'/></pubsub></iq>";
	},
	items: function(aTo, aNode) {
		return  "<iq type='get' to='"+aTo+"'><pubsub xmlns='"+Mango.NS.pubsub+"'><items node='"+aNode+"'/></pubsub></iq>";
	},
	affiliations: function(aTo, aNode) {
		return "<iq type='get' to='"+aTo+"'><pubsub xmlns='"+Mango.NS.pubsub_owner+"'><affiliations node='"+aNode+"'/></pubsub></iq>";
	},
	publish: function(aTo, aNode, aItem, aId) {
		return  "<iq type='set' to='"+aTo+"'><pubsub xmlns='"+Mango.NS.pubsub+"'><publish node='"+aNode+"'><item id='"+aId+"'>"+aItem+"</item></publish></pubsub></iq>";
	},
	retract: function(aTo, aNode, aItem) {
		return  "<iq type='set' to='"+aTo+"'><pubsub xmlns='"+Mango.NS.pubsub+"'><retract node='"+aNode+"'><item id='"+aItem+"'/></retract></pubsub></iq>";
	},
	'delete': function(aTo, aNode, aURI) {
		return  "<iq type='set' to='"+aTo+"'><pubsub xmlns='"+Mango.NS.pubsub_owner+"'><delete node='"+aNode+"'/></pubsub></iq>";
	},
	create: function(aTo, aNode, aFields) {
		var iq = "<iq type='set' to='"+aTo+"'><pubsub xmlns='"+Mango.NS.pubsub+"'><create node='"+aNode+"'/>";
		if(aFields) {
			iq += "<configure><x xmlns='"+Mango.NS.x+"' type='submit'>"
			aFields.forEach(function(field) {
				iq += field;
			});
			iq += "</x></configure>";
		}
		iq += "</pubsub></iq>";
		return iq;
	},
	setAffiliations: function(aTo, aNode, aAffiliations) {
		var iq = "<iq type='set' to='"+aTo+"'><pubsub xmlns='"+Mango.NS.pubsub_owner+"'><affiliations node='"+aNode+"'>";
		for(var i = 0; i < aAffiliations.length; i++) {
			iq += "<affiliation jid='"+aAffiliations[i][0]+"' affiliation='"+aAffiliations[i][1]+"'/>"
		}
		iq += "</affiliations></pubsub></iq>";
		return iq;
	},
};
Lighstring.pubsubItems = function(aConnection, aTo, aNode, aCallback) {
	aConnection.send(Mango.stanza.pubsub.items(aTo, aNode), function(answer){
		var items = [];
		answer.querySelectorAll('item').forEach(function(node) {
			var item = {
				id: node.getAttribute('id'),
				name: node.querySelector('title').textContent,
				src: node.querySelector('content').getAttribute('src'),
				type: node.querySelector('content').getAttribute('type'),
			}
			var thumbnail = node.querySelector('link');
			if(thumbnail)
				item.thumbnail = thumbnail.getAttribute('href');
			items.push(item);
		})
		if(aCallback)
			aCallback(items);
	});
}
Lighstring.pubsubCreate = function(aConnection, aTo, aNode, aFields, aCallback) {
	aConnection.send(Mango.stanza.pubsub.create(aTo, aNode, aFields), function(answer) {
		if(answer.getAttribute('type') === 'result')
			aCallback(null, answer);
		else
			aCallback(answer, null);
	});
};
Lighstring.pubsubConfig = function(aConnection, aTo, aNode, aCallback) {
	aConnection.send(Mango.stanza.pubsub.getConfig(aTo, aNode), function(answer){
		var accessmodel = answer.querySelector('field[var="pubsub#access_model"]').lastChild.textContent;
		if(accessmodel)
			aCallback(accessmodel);
		else
			aCallback(null);
	});
}
Lighstring.pubsubRetract = function(aConnection, aTo, aNode, aItem, aCallback) {
	aConnection.send(Mango.stanza.pubsub.retract(aTo, aNode, aItem), function(answer){
		if(aCallback)
			aCallback(answer);
	});
}
Lighstring.pubsubPublish = function(aConnection, aTo, aNode, aItem, aId, aCallback) {
	aConnection.send(Mango.stanza.pubsub.publish(aTo, aNode, aItem, aId), function(answer){
		if(answer.getAttribute('type') === 'result')
			aCallback(null, answer);
		else
			aCallback(answer, null);
	});
}
Lighstring.pubsubDelete = function(aConnection, aTo, aNode, aCallback) {
	aConnection.send(Mango.stanza.pubsub.delete(aTo, aNode), function(answer){
		if(aCallback)
			aCallback(answer);
	});
}
Lighstring.pubsubGetAffiliations = function(aConnection, aTo, aNode, aCallback) {
	aConnection.send(Mango.stanza.pubsub.affiliations(aTo, aNode), function(answer) {
		if((answer.getAttribute('type') === 'result') && aCallback) {
			var affiliations = {};
			answer.querySelectorAll('affiliation').forEach(function(affiliation) {
				affiliations[affiliation.getAttribute("jid")] = affiliation.getAttribute("affiliation");
			})
			aCallback(affiliations);
		}
	});
};
Lighstring.pubsubSetAffiliations = function(aConnection, aTo, aNode, aAffiliations, aCallback) {
	aConnection.send(Mango.stanza.pubsub.setAffiliations(aTo, aNode, aAffiliations));
};
//
//IM
//
Lighstring.stanza.message = {
	normal: function(aTo, aSubject, aText) {
		return "<message type='normal' to='"+aTo+"'><subject>"+aSubject+"</subject><body>"+aText+"</body></message>";
	},
	chat: function(aTo, aText) {
		return "<message type='chat' to='"+aTo+"'><body>"+aText+"</body></message>";
	}
};

