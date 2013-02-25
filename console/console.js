'use strict';

(function() {

  var entriesEl;

  var Console = {
    holder: [],
    log: function(aLog) {
      if (document.readyState !== 'complete') {
        this.holder.push(aLog);
        return;
      }

      var entry = this.buildLogEntry(aLog);

      var child = entriesEl.firstChild;
      if(child)
        entriesEl.insertBefore(entry, child);
      else  
        entriesEl.appendChild(entry)
    },
    buildLogEntry: function(aLog) {
      //beautify
      var stanza = vkbeautify.xml(aLog.data, 2, ' ');
      var entry = document.createElement('div');
      entry.classList.add('entry');
      entry.classList.add(aLog.dir);
      var header = document.createElement('header');
      var date = new Date();
      var hours = (date.getHours() < 10 ? '0' : '') + date.getHours();
      var minutes = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
      var seconds = (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
      var timestamp = hours + ':' + minutes + ':' + seconds + '.' + date.getMilliseconds();
      header.textContent = aLog.dir + ': ' + timestamp;
      entry.appendChild(header)
      var pre = document.createElement('pre');
      pre.textContent = stanza;
      entry.appendChild(pre);
      //highlight
      hljs.highlightBlock(entry.children[1], null, false);

      return entry;
    },
    filter: function(aFilter) {
      var entries = document.querySelectorAll('.entry pre');
      for (var i = 0, length = entries.length; i < length; i++) {
        var entry = entries[i];
        if (!entry.textContent.match(aFilter))
          entry.parentNode.hidden = true;
        else
          entry.parentNode.hidden = false;
      }
    },
    send: function(aData) {
      //C'mon you can do better
      Lightstring.connections[0].send(aData)
    },
    init: function() {
      if (Lightstring.Connection) {
        Lightstring.connections[0].on('stanza', function(stanza) {
          Lightstring.console.log({dir: 'in', data: stanza.toString()});
        });
        Lightstring.connections[0].on('out', function(stanza) {
          Lightstring.console.log({dir: 'out', data: stanza.toString()});
        });
      }
      if (document.readyState === 'complete')
        return this.initView();

      var that = this;
      document.addEventListener('DOMContentLoaded', function() {
        that.initView()
      });
    },
    focusInput: function() {
      document.querySelector('textarea').focus();
    },
    initView: function() {
      for (var i = 0, length = this.holder.length; i < length; i++) {
        Console.log(this.holder[i]);
        delete this.holder[i];
      };


      entriesEl = document.getElementById('entries');
      document.getElementById('input').addEventListener('submit', function(e) {
        e.preventDefault();
        Console.send(this.elements['field'].value)
      });
      document.getElementById('clear').addEventListener('click', function(e) {
        entriesEl.innerHTML = '';
      });
      //FIXME allow xpath, xquery, E4X, whatever XML query syntax
      document.getElementById('filter').addEventListener('input', function(e) {
        Console.filter(this.value);
      });
      document.getElementById('input').addEventListener('keypress', function(e) {
        if (e.keyCode === 13) {
          if (e.shiftKey) {
            e.preventDefault();
            var event = document.createEvent('Event');
            event.initEvent('submit', true, true);
            this.dispatchEvent(event);
          }
        }
      });
    }
  };

  //Lightstring is defined in the parent window context
  if (window.frameElement && window.parent) {
    var handleConsole = function() {
      window.Lightstring = window.parent.Lightstring;
      Lightstring.console = Console;
      Lightstring.console.init();
    };

    if (window.parent.Lightstring)
      handleConsole();
    else {
      if (window.parent.document.readyState !== 'complete') {
        window.parent.document.addEventListener('DOMContentLoaded', function() {
          handleConsole();
        });
      }
      else
        console.warn('You must add the Lightstring library to use this console.');
    }
  }
  else {
    //TODO: link to a doc?
    console.warn('You must embed this in a iframe.');
  }
})();