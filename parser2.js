'usr strict';

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

// Changes XML to JSON
function xmlToJson(xml) {
  if (xml.nodeType !== 1 && xml.nodeType !== 9)
    return;

  var attrs = {};
  for (var i = 0, length = xml.attributes.length; i < length; i++)
    attrs[xml.attributes[i].name] = xml.attributes[i].value;

  var el = new Element(xml.tagName, attrs);

  //children
  for (var i = 0, length = xml.childNodes.length; i < length; i++) {
    if (xml.childNodes[i].nodeType === 3) {
      el.t(xml.childNodes[i].nodeValue).up();
    }
    else {
      el.cnode(xmlToJson(xml.childNodes[i]))
    }
  }

  return el;
};

window.parseTest = function(test) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(test, "application/xml");
  return(xmlToJson(doc.firstChild));
}

})();