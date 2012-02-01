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

/////////
//Disco//
/////////

(function() {
  var form_types = ['cancel', 'form', 'result', 'submit'];
  var field_types = ['boolean', 'fixed', 'hidden', 'jid-multi', 'jid-single', 'list-multi', 'list-single', 'text-multi', 'text-private', 'text-single'];

  var parseFields = function(fieldsList) {
    var fields = [];

    for (var i = 0; i < fieldsList.length; i++) {
      var field = {};
      var child = fieldsList[i];

      var type = child.getAttributeNS(null, 'type');
      if (field_types.indexOf(type) === -1)
        field.type = type;
      else
        field.type = 'text-single';

      var label = child.getAttributeNS(null, 'label');
      if (label)
        field.label = label;

      var _var = child.getAttributeNS(null, 'var');
      if (_var)
        field.var = _var;

      var desc = child.getElementsByTagNameNS(Lightstring.namespaces['dataforms'], 'desc');
      if (desc.length > 1)
        ; //TODO: emit a warning if there is more than one.
      if (0 in desc)
        field.desc = desc[0];

      var required = child.getElementsByTagNameNS(Lightstring.namespaces['dataforms'], 'required');
      if (required.length > 1)
        ; //TODO: emit a warning if there is more than one.
      field.required = (0 in required)

      var values = child.getElementsByTagNameNS(Lightstring.namespaces['dataforms'], 'value');
      if (values.length) {
        field.values = [];
        for (var j = 0; j < values.length; j++)
          field.values.push(values[j].textContent);
      }

      var options = child.getElementsByTagNameNS(Lightstring.namespaces['dataforms'], 'option');
      if (options.length) {
        field.options = [];
        for (var j = 0; j < options.length; j++) {
          var option = {};

          var opt = options[j];

          var val = opt.getElementsByTagNameNS(Lightstring.namespaces['dataforms'], 'value');
          if (val.length > 1)
            ; //TODO: emit a warning if there is more than one.
          if (0 in val)
            option.value = val[0];

          var optionLabel = opt.getAttributeNS(null, 'label');
          if (optionLabel)
            option.label = optionLabel;

          field.options.push(option);
        }
      }

      fields.push(field);
    }

    return fields;
  };

  Lightstring.plugins['disco'] = {
    namespaces: {
      dataforms: 'jabber:x:data'
    },
    methods: {
      parse: function(x) {
        if (x.namespaceURI !== Lightstring.namespaces['dataforms'] || x.localName !== 'x')
          return null;

        var form = {};

        var type = x.getAttributeNS(null, 'type');
        if (form_types.indexOf(type) === -1)
          return; //TODO: emit a warning too?
        form.type = type;

        var title = x.getElementsByTagNameNS(Lightstring.namespaces['dataforms'], 'title');
        if (title.length > 1)
          ; //TODO: emit a warning if there is more than one.
        else if (0 in title)
          form.title = title[0];

        var fields = parseFields(x.getElementsByTagNameNS(Lightstring.namespaces['dataforms'], 'fields'));
        if (fields)
          form.fields = fields

        var reported = x.getElementsByTagNameNS(Lightstring.namespaces['dataforms'], 'reported');
        if (reported.length > 1)
          ; //TODO: emit a warning if there is more than one.
        else if (0 in reported) {
          var fields = parseFields(reported[0].getElementsByTagNameNS(Lightstring.namespaces['dataforms'], 'fields'));
          if (fields)
            form.reported = fields
        }

        var itemsList = x.getElementsByTagNameNS(Lightstring.namespaces['dataforms'], 'item');
        if (itemsList) {
          var fields = parseFields(itemsList[0].getElementsByTagNameNS(Lightstring.namespaces['dataforms'], 'fields'));
          if (fields)
            form.items = fields;
        }

        return form;
      }
    }
  };
})();
