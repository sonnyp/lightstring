'use strict';

var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;

if(!Lightstring)
  var Lightstring = {};

Lightstring.console = {
  invertedScroll: true,
  log: function(aLog) {
    var stanza = vkbeautify.xml(aLog.data, 2, ' ');
    var entry = document.createElement('div');
    entry.classList.add('entry');
    entry.classList.add(aLog.dir);
    var header = document.createElement('header');
    //FIXME date? should come from the origin?
    header.textContent = aLog.dir + ': ';
    entry.appendChild(header)
    var pre = document.createElement('pre');
    pre.textContent = stanza;
    entry.appendChild(pre);
    var entriesEl = document.querySelector('#entries')
    entriesEl.appendChild(entry);
  },
  filter: function(aFilter) {
    var entries = document.querySelectorAll('.entry pre');
    for (var i = 0, length = entries.length; i < length; i++) {
      var entry = entries[i];
      if (!entry.textContent.match(aFilter))
        entry.parentNode.hidden = true;
      else
        entry.parentNode.hidden = false;

    //FIXME use the Mutation Observer? get back to the previous scroll state?
    this.scrollToBottom();
    }
  },
  send: function(aData) {
    Lightstring.console.source.postMessage({
      'send': aData}, document.location.protocol + '//' + document.location.host);
  },
  scrollToBottom: function() {
    this.entriesEl.scrollTop = (this.entriesEl.scrollHeight - this.entriesEl.clientHeight);
  }
};

(function() {
  document.addEventListener('DOMContentLoaded', function() {

    var entriesEl = document.getElementById('entries');
    entriesEl.addEventListener('scroll', function(e) {
      if (entriesEl.scrollTop === (entriesEl.scrollHeight - entriesEl.clientHeight))
        Lightstring.console.invertedScroll = true;
      else
        Lightstring.console.invertedScroll = false;
    })

    new MutationObserver(function(mutations) {
      if(Lightstring.console.invertedScroll === true)
        Lightstring.console.scrollToBottom();
    }).observe(entriesEl, {
      childList: true,
      // attributes: false,
      // characterData: false
    });

    Lightstring.console.entriesEl = entriesEl;
    if (Lightstring.console.invertedScroll)
      Lightstring.console.scrollToBottom();

    window.addEventListener("message", function(e) {
      if(!Lightstring.console.source)
        Lightstring.console.source = e.source;

      Lightstring.console.log(e.data);
    }, false);

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
  });
})();