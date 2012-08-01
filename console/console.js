'use strict';

(function() {
  var Console = {
    holder: [],
    invertedScroll: true,
    log: function(aLog) {
      if (document.readyState !== 'complete') {
        this.holder.push(aLog);
        return;
      }
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
      var entriesEl = document.querySelector('#entries')

      var child = entriesEl.firstChild;
      if(child)
        entriesEl.insertBefore(entry, child);
      else  
        entriesEl.appendChild(entry)
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
        Lightstring.Connection.prototype.on('stanza', function(stanza) {
          Lightstring.console.log({dir: 'in', data: stanza.toString()});
        });
        Lightstring.Connection.prototype.on('out', function(stanza) {
          Lightstring.console.log({dir: 'out', data: stanza.toString()});
        });
      }
      if (document.readyState === 'complete')
        return this.initView();

      document.addEventListener('DOMContentLoaded', this.initView);
    },
    initView: function() {
      Lightstring.console.holder.forEach(function(log) {
        Lightstring.console.log(log);
      });


      var entriesEl = document.getElementById('entries');
      Console.entriesEl = entriesEl;

      document.getElementById('input').addEventListener('submit', function(e) {
        e.preventDefault();
        Lightstring.console.send(this.elements['field'].value)
      });
      document.getElementById('clear').addEventListener('click', function(e) {
        Lightstring.console.entriesEl.innerHTML = '';
      });
      //FIXME allow xpath, xquery, E4X, whatever XML query syntax
      document.getElementById('filter').addEventListener('input', function(e) {
        Lightstring.console.filter(this.value);
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
  if (window.frameElement && window.parent.Lightstring) {
    window.Lightstring = window.parent.Lightstring;
    Lightstring.console = Console;
    Lightstring.console.init();
  }
  else {
    //TODO: link to a doc?
    console.error('You must embed this in a iframe.');
  }
})();