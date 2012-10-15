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

(function() {

/**
 * @private
 */
var doc = document.implementation.createDocument(null, 'dummy', null);
/**
 * @private
 */
var parser = new DOMParser();
/**
 * @private
 */
var serializer = new XMLSerializer();
/**
 * @function Process a XML string to a DOM tree.
 * @param {String} aString XML string.
 * @return {Object} Domified XML.
 */
var parse = function(aString) {
  var el = parser.parseFromString(aString, 'text/xml').documentElement;
  if (el.tagName === 'parsererror')
    ;//FIXME: do something?

  return el;
};
/**
 * @function Process a DOM treee to a XML string.
 * @param {Object} aString DOM object.
 * @return {String} Stringified DOM.
 */
var serialize = function(aElement) {
  var string = null;
  try {
    string = serializer.serializeToString(aElement);
  }
  catch (e) {
    //TODO: error
  }
  finally {
    return string;
  };
};


/**
 * @constructor Creates a new Stanza object.
 * @param {String|Object} [aStanza] The XML or DOM content of the stanza
 */
var Stanza = function(aStanza) {
  return this.createEl(aStanza);
};
// Stanza.prototype = Element.prototype;
/**
 * @constructor Creates a new Message stanza object.
 * @param {String|Object} [aStanza] The XML or DOM content of the stanza
 */
 var Message = function(aStanza) {
  if ((typeof aStanza === 'object') && (!(aStanza instanceof Element)))
    aStanza.name = 'message';
  this.createEl(aStanza);
};
Message.prototype = Stanza.prototype;
/**
 * @constructor Creates a new IQ stanza object.
 * @param {String|Object} [aStanza] The XML or DOM content of the stanza
 */
var IQ = function(aStanza) {
  if ((typeof aStanza === 'object') && (!(aStanza instanceof Element)))
    aStanza.name = 'iq';
  this.createEl(aStanza);
};
IQ.prototype = Stanza.prototype;
/**
 * @constructor Creates a new Presence stanza object.
 * @param {String|Object} [aStanza] The XML or DOM content of the stanza
 */
var Presence = function(aStanza) {
  if ((typeof aStanza === 'object') && (!(aStanza instanceof Element)))
    aStanza.name = 'presence';
  this.createEl(aStanza);
};
Presence.prototype = Stanza.prototype;
Stanza.prototype.createEl = function(aStanza) {
  if (typeof aStanza === 'string') {
    return parseTest(aStanza);
  }
  else if (aStanza instanceof Element)
    return aStanza;
  // else if (typeof aStanza === 'object') {
  //   var el = doc.createElement(aStanza.name);
  //   this.el = el;
  //   delete aStanza.name;
  //   for (var i in aStanza) {
  //     this[i] = aStanza[i];
  //   }
  // }
  else
    return null;
};
// Stanza.prototype.toString = function() {
//   return this.el.root().toString();
//   // return serialize(this.el);this.el.root.toString();
// };
Stanza.prototype.reply = function(aProps) {
  var props = aProps || {};

  props.name = this.name;
  var reply = new Stanza(props);

  if (this.from)
    reply.to = this.from;


  if (reply.name !== 'iq')
    return reply;

  if (this.id)
    reply.id = this.id;

  reply.type = 'result';

  return reply;
};

//from attribute
Object.defineProperty(Stanza.prototype, "from", {
  get : function(){
    return this.el.getAttribute('from');
  },  
  set : function(aString) {
    this.el.setAttribute('from', aString);
  },  
  enumerable : true,  
  configurable : true
});
// //stanza tag name
// Object.defineProperty(Stanza.prototype, "name", {
//   get : function(){
//     return this.el.localName;
//   },
//   //FIXME
//   // set : function(newValue){ bValue = newValue; },  
//   enumerable : true,  
//   configurable : true
// });
//id attribute
Object.defineProperty(Stanza.prototype, "id", {
  get : function(){
    return this.el.getAttribute('id');
  },  
  set : function(aString) {
    this.el.setAttribute('id', aString);
  }, 
  enumerable : true,  
  configurable : true
});
//to attribute
Object.defineProperty(Stanza.prototype, "to", {
  get : function(){
    return this.el.getAttribute('to');
  },  
  set : function(aString) {
    this.el.setAttribute('to', aString);
  },
  enumerable : true,  
  configurable : true
});
//type attribute
Object.defineProperty(Stanza.prototype, "type", {
  get : function(){
    return this.el.getAttribute('type');
  },
  set : function(aString) {
    this.el.setAttribute('type', aString);
  },
  enumerable : true,  
  configurable : true
});
//body
Object.defineProperty(Stanza.prototype, "body", {
  get : function(){
    var bodyEl = this.el.getElementsByTagName('body')[0];
    if (!bodyEl)
      return null;
    else
      return bodyEl.textContent;
  },
  set : function(aString) {
    var bodyEl = this.el.getElementsByTagName('body')[0];
    if (!bodyEl) {
      bodyEl = doc.createElement('body');
      bodyEl = this.el.appendChild(bodyEl);
    }
    bodyEl.textContent = aString;
  },
  enumerable : true,  
  configurable : true
});
//subject
Object.defineProperty(Stanza.prototype, "subject", {
  get : function(){
    var subjectEl = this.el.querySelector('subject').textContent;
    if (!subjectEl)
      return null;
    else
      return subjectEl.textContent;
  },
  set : function(aString) {
    var subjectEl = this.el.querySelector('subject');
    if (!subjectEl) {
      subjectEl = doc.createElement('subject');
      subjectEl = this.el.appendChild(subjectEl);
    }
    subjectEl.textContent = aString;
  },
  enumerable : true,  
  configurable : true
});
Stanza.prototype.replyWithSubscribed = function(aProps) {
  var reply = this.reply(aProps);
  reply.type = 'subscribed';

  return reply;
};

Lightstring.Stanza = Stanza;
Lightstring.Presence = Presence;
Lightstring.IQ = IQ;
Lightstring.Message = Message;
Lightstring.doc = doc;

})();