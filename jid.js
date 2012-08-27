'use strict';

/**
  Copyright (c) 2012, Emmanuel Gil Peyrot <linkmauve@linkmauve.fr>

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

//https://tools.ietf.org/html/rfc6122

(function() {

/**
 * @constructor Creates a new JID object.
 * @param {String} [aJID] The host, bare or full JID.
 * @memberOf Lightstring
 */
var JID = function(aJID) {
  this.local = null;
  this.domain = null;
  this.resource = null;

  if (aJID)
    this.full = aJID.toString();

  //TODO: use a stringprep library to validate the input.
};

JID.prototype = {
  toString: function() {
    return this.full;
  },

  equals: function(aJID) {
    if (!(aJID instanceof Lightstring.JID))
      aJID = new Lightstring.JID(aJID);

    return (this.local === aJID.local &&
            this.domain === aJID.domain &&
            this.resource === aJID.resource)
  },

  toBare: function() {
    var aJID = this;
    aJID.resource = null;
    return aJID;
  },

  get bare() {
    if (!this.domain)
      return null;

    if (this.local)
      return this.local + '@' + this.domain;

    return this.domain;
  },

  set bare(aJID) {
    if (!aJID)
      return;

    var s = aJID.indexOf('/');
    if (s != -1)
      aJID = aJID.substring(0, s);

    s = aJID.indexOf('@');
    if (s == -1) {
      this.local = null;
      this.domain = aJID;
    } else {
      this.local = aJID.substring(0, s);
      this.domain = aJID.substring(s+1);
    }
  },

  get full() {
    if (!this.domain)
      return null;

    var full = this.domain;

    if (this.local)
      full = this.local + '@' + full;

    if (this.resource)
      full = full + '/' + this.resource;

    return full;
  },

  set full(aJID) {

    if (!aJID)
      return;

    var s = aJID.indexOf('/');
    if (s == -1)
      this.resource = null;
    else {
      this.resource = aJID.substring(s+1);
      aJID = aJID.substring(0, s);
    }

    s = aJID.indexOf('@');
    if (s == -1) {
      this.local = null;
      this.domain = aJID;
    }
    else {
      this.local = aJID.substring(0, s);
      this.domain = aJID.substring(s+1);
    }
  }
};

Lightstring.JID = JID;

})();

