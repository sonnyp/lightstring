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


/**
 * @constructor Creates a new Stanza object.
 * @param {String|Object} [aStanza] The XML or DOM content of the stanza
 * @memberOf Lightstring
 */
Lightstring.Stanza = function(aStanza) {
  if (typeof aStanza === 'string')
    this.el = Lightstring.parse(aStanza);
  else if (aStanza instanceof Element)
    this.el = aStanza;
  else
    this.el = null;//TODO error
};
Lightstring.Stanza.prototype.toString = function() {
  return Lightstring.serialize(this.el);
};