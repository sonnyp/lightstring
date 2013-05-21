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
'use strict';

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
 * @function Process a DOM tree to a ltx Element.
 * @param {Object} DOM tree.
 * @return {Object} ltx Element.
 */
var parseDOM = function(xml) {
  if (xml.nodeType !== 1 && xml.nodeType !== 9)
    return;

  var attrs = {};
  for (var i = 0, length = xml.attributes.length; i < length; i++)
    attrs[xml.attributes[i].name] = xml.attributes[i].value;

  var el = new Lightstring.Element(xml.tagName, attrs);

  //children
  for (var i = 0, length = xml.childNodes.length; i < length; i++) {
    if (xml.childNodes[i].nodeType === 3) {
      el.t(xml.childNodes[i].nodeValue).up();
    }
    else {
      el.cnode(parseDOM(xml.childNodes[i]));
    }
  }

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
  }
};
/**
 * @constructor Creates a new Stanza object.
 * @param {String|Object} [aStanza] The XML or DOM content of the stanza
 */
var Stanza = function(aStanza) {
  if (typeof aStanza === 'string') {
    var DOMTree = parse(aStanza);
    return parseDOM(DOMTree);
  }
  else if (aStanza instanceof Lightstring.Element)
    return aStanza;
  else
    return null;
};

Lightstring.Stanza = Stanza;
Lightstring.doc = doc;

})();
