(function() {
  'use strict';

  var script = document.currentScript;
  if (!script) {
    var scripts = document.getElementsByTagName('script');
    script = scripts[scripts.length - 1];
  }

  var src = script && script.src ? script.src : '';
  var match = src.match(/^(https?:\/\/[^\/]+)/);
  var host = match ? match[1] : '';
  var version = new Date().getTime();

  if (!host) return;
  Lampa.Utils.putScriptAsync([host + '/online.js?v=' + version], function() {});
})();
