
    if(!window.loaded_modss) {
      //show
Date.now||(Date.now=function(){return(new Date.getTime())}),function(){"use strict";for(var t=["webkit","moz"],e=0;e<t.length&&!window.requestAnimationFrame;++e){var i=t[e];window.requestAnimationFrame=window[i+"RequestAnimationFrame"],window.cancelAnimationFrame=window[i+"CancelAnimationFrame"]||window[i+"CancelRequestAnimationFrame"]}if(/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent)||!window.requestAnimationFrame||!window.cancelAnimationFrame){var s=0;window.requestAnimationFrame=function(t){var e=Date.now(),i=Math.max(s+16,e);return setTimeout(function(){t(s=i)},i-e)},window.cancelAnimationFrame=clearTimeout}}(),function(t){t.snowfall=function(e,i){function s(s,n,a,r){this.x=s,this.y=n,this.size=a,this.speed=r,this.step=0,this.stepSize=h(1,10)/100,i.collection&&(this.target=m[h(0,m.length-1)]);var p=null;i.image?(p=document.createElement("img"),p.src=i.image):(p=document.createElement("div"),t(p).css({background:i.flakeColor})),t(p).attr({"class":"snowfall-flakes"}).css({width:this.size,height:this.size,position:i.flakePosition,top:this.y,left:this.x,fontSize:0,zIndex:i.flakeIndex}),t(e).get(0).tagName===t(document).get(0).tagName?(t("body").append(t(p)),e=t("body")):t(e).append(t(p)),this.element=p,this.update=function(){if(this.y+=this.speed,this.y>l-(this.size+6)&&this.reset(),this.element.style.top=this.y+"px",this.element.style.left=this.x+"px",this.step+=this.stepSize,y===!1?this.x+=Math.cos(this.step):this.x+=y+Math.cos(this.step),i.collection&&this.x>this.target.x&&this.x<this.target.width+this.target.x&&this.y>this.target.y&&this.y<this.target.height+this.target.y){var t=this.target.element.getContext("2d"),e=this.x-this.target.x,s=this.y-this.target.y,n=this.target.colData;if(void 0!==n[parseInt(e)][parseInt(s+this.speed+this.size)]||s+this.speed+this.size>this.target.height)if(s+this.speed+this.size>this.target.height){for(;s+this.speed+this.size>this.target.height&&this.speed>0;)this.speed*=.5;t.fillStyle=o.flakeColor,void 0==n[parseInt(e)][parseInt(s+this.speed+this.size)]?(n[parseInt(e)][parseInt(s+this.speed+this.size)]=1,t.fillRect(e,s+this.speed+this.size,this.size,this.size)):(n[parseInt(e)][parseInt(s+this.speed)]=1,t.fillRect(e,s+this.speed,this.size,this.size)),this.reset()}else this.speed=1,this.stepSize=0,parseInt(e)+1<this.target.width&&void 0==n[parseInt(e)+1][parseInt(s)+1]?this.x++:parseInt(e)-1>0&&void 0==n[parseInt(e)-1][parseInt(s)+1]?this.x--:(t.fillStyle=o.flakeColor,t.fillRect(e,s,this.size,this.size),n[parseInt(e)][parseInt(s)]=1,this.reset())}(this.x+this.size>d-c||this.x<c)&&this.reset()},this.reset=function(){this.y=0,this.x=h(c,d-c),this.stepSize=h(1,10)/100,this.size=h(100*i.minSize,100*i.maxSize)/100,this.element.style.width=this.size+"px",this.element.style.height=this.size+"px",this.speed=h(i.minSpeed,i.maxSpeed)}}function n(){for(r=0;r<a.length;r+=1)a[r].update();p=requestAnimationFrame(function(){n()})}var a=[],o={flakeCount:35,flakeColor:"#ffffff",flakePosition:"absolute",flakeIndex:999999,minSize:1,maxSize:2,minSpeed:1,maxSpeed:5,round:!1,shadow:!1,collection:!1,collectionHeight:40,deviceorientation:!1},i=t.extend(o,i),h=function(t,e){return Math.round(t+Math.random()*(e-t))};t(e).data("snowfall",this);var r=0,l=t(e).height(),d=t(e).width(),c=0,p=0;if(i.collection!==!1){var f=document.createElement("canvas");if(f.getContext&&f.getContext("2d"))for(var m=[],w=t(i.collection),g=i.collectionHeight,r=0;r<w.length;r++){var u=w[r].getBoundingClientRect(),x=t("<canvas/>",{"class":"snowfall-canvas"}),z=[];if(u.top-g>0){t("body").append(x),x.css({position:i.flakePosition,left:u.left+"px",top:u.top-g+"px"}).prop({width:u.width,height:g});for(var v=0;v<u.width;v++)z[v]=[];m.push({element:x.get(0),x:u.left,y:u.top-g,width:u.width,height:g,colData:z})}}else i.collection=!1}for(t(e).get(0).tagName===t(document).get(0).tagName&&(c=25),t(window).bind("resize",function(){l=t(e)[0].clientHeight,d=t(e)[0].offsetWidth}),r=0;r<i.flakeCount;r+=1)a.push(new s(h(c,d-c),h(0,l),h(100*i.minSize,100*i.maxSize)/100,h(i.minSpeed,i.maxSpeed)));i.round&&t(".snowfall-flakes").css({"-moz-border-radius":i.maxSize,"-webkit-border-radius":i.maxSize,"border-radius":i.maxSize}),i.shadow&&t(".snowfall-flakes").css({"-moz-box-shadow":"1px 1px 1px #555","-webkit-box-shadow":"1px 1px 1px #555","box-shadow":"1px 1px 1px #555"});var y=!1;i.deviceorientation&&t(window).bind("deviceorientation",function(t){y=.1*t.originalEvent.gamma}),n(),this.clear=function(){t(".snowfall-canvas").remove(),t(e).children(".snowfall-flakes").remove(),cancelAnimationFrame(p)}},t.fn.snowfall=function(e){return"object"==typeof e||void 0==e?this.each(function(i){new t.snowfall(this,e)}):"string"==typeof e?this.each(function(e){var i=t(this).data("snowfall");i&&i.clear()}):void 0}}(jQuery);

      (function () {
        'use strict';

        
  try {
    if (!Array.isArray(window.__modssConsoleBuf)) window.__modssConsoleBuf = [];

    window.__modssConsoleOnCall = function (method, args) {
      try {
        var buf = window.__modssConsoleBuf;
        if (!Array.isArray(buf)) { buf = []; window.__modssConsoleBuf = buf; }
        var list = args && typeof args.length === 'number' ? Array.prototype.slice.call(args) : [];
        var line = list.map(function (a) {
          if (a == null) return String(a);
          if (typeof a === 'string' || typeof a === 'number' || typeof a === 'boolean') return String(a);
          try { return JSON.stringify(a); } catch (eJ) { return String(a); }
        }).join(' ');
        buf.push({ t: Date.now(), m: method || 'log', line: line });
        while (buf.length > 800) buf.shift();
      } catch (eCap) { }
    };

    window.__modssEnsureConsoleCapture = function () {
      try {
        if (!Array.isArray(window.__modssConsoleBuf)) window.__modssConsoleBuf = [];
        var methods = ['log', 'info', 'warn', 'error', 'debug'];
        for (var i = 0; i < methods.length; i++) {
          (function (method) {
            /** try на каждый метод: на части WebView console.* только для чтения —
             *  раньше падение на первом методе снимало перехват целиком. */
            try {
              var cur = console[method];
              if (typeof cur !== 'function' || cur.__modssCap) return;
              var orig = cur;
              var wrapped = function () {
                try { if (typeof window.__modssConsoleOnCall === 'function') window.__modssConsoleOnCall(method, arguments); } catch (e1) { }
                try { return orig.apply(console, arguments); } catch (e2) { }
              };
              wrapped.__modssCap = 1;
              console[method] = wrapped;
              if (console[method] !== wrapped) {
                Object.defineProperty(console, method, { value: wrapped, configurable: true, writable: true });
              }
            } catch (eM) {
              window.__modssConsoleCaptureError = String((eM && eM.message) || eM).slice(0, 200);
            }
          })(methods[i]);
        }
        window.__modssConsoleCapture = !!(typeof console.log === 'function' && console.log.__modssCap);
      } catch (eEns) {
        window.__modssConsoleCaptureError = String((eEns && eEns.message) || eEns).slice(0, 200);
      }
    };

    window.__modssEnsureConsoleCapture();
    setInterval(window.__modssEnsureConsoleCapture, 1000);
  } catch (eBootCap) { }


        var pluginSetup = {
  urlKey: function (url) {
    return String(url == null ? '' : url).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  },

  accountPluginKeys: function (done) {
    Lampa.Account.Api.plugins(function (items) {
      var keys = [];

      for (var i = 0; i < (items || []).length; i++) {
        var key = Number(items[i].status) === 1 ? pluginSetup.urlKey(items[i].url) : '';

        if (key) keys.push(key);
      }

      done(keys);
    });
  },

  detectShell: function () {
    var ua = String(navigator.userAgent || '').toLowerCase();

    if (typeof webapis !== 'undefined' && typeof tizen !== 'undefined') return 'tizen';
    if (typeof webOS !== 'undefined' && webOS.platform && webOS.platform.tv === true) return 'webos';
    if (window.TVXHost || window.TVXManager) return 'msx';
    if (ua.indexOf('tizen') !== -1 || ua.indexOf('webos') !== -1 || ua.indexOf('web0s') !== -1) return 'msx';
    if (Lampa.Platform.is('apple_tv')) return 'apple_tv';
    if (Lampa.Utils.isPWA()) return 'pwa';

    return '';
  },

  baseDeviceId: function (value) {
    return String(value == null ? '' : value).trim().replace(/_(?:pwa|msx|apple_tv|tizen|webos)$/, '');
  },

  taggedDeviceId: function (value) {
    var base = pluginSetup.baseDeviceId(value);
    var shell = pluginSetup.detectShell();

    return base && shell ? base + '_' + shell : base;
  },

  saveDeviceId: function (value) {
    var deviceId = pluginSetup.taggedDeviceId(value);

    if (deviceId && deviceId !== Lampa.Storage.get('modss_device_id', '')) {
      Lampa.Storage.set('modss_device_id', deviceId);
    }

    return deviceId;
  },

  resolveDeviceId: function (issuedId) {
    var cached = Lampa.Storage.get('modss_device_id', '');

    return cached ? pluginSetup.saveDeviceId(cached) : pluginSetup.taggedDeviceId(issuedId);
  },

  syncDeviceId: function (issuedId, onReady) {
    var attempts = 0;

    var tick = function () {
      var cached = Lampa.Storage.get('modss_device_id', '');

      if ((!cached || !pluginSetup.detectShell()) && attempts++ < 15) return setTimeout(tick, 100);

      if (typeof onReady === 'function') onReady(pluginSetup.saveDeviceId(cached || issuedId));
    };

    tick();
  },

  shell: function () {
    return pluginSetup.detectShell() || Lampa.Platform.get();
  },

  deviceKind: function (base) {
    var kind = String(base || 'other');
    var shell = pluginSetup.shell();
    if (!shell || kind.indexOf('_') !== -1) return kind;
    return kind + '_' + shell;
  },

  logDevice: function (base, issuedId, onChange) {
    pluginSetup.syncDeviceId(issuedId, function (deviceId) {
      if (deviceId && typeof onChange === 'function') onChange(deviceId);
      console.log('Modss', 'device', '[' + pluginSetup.deviceKind(base) + ']');
    });
  },

  cleanPluginList: function (liveUrls, deadUrls) {
    pluginSetup.accountPluginKeys(function (accountKeys) {
      pluginSetup.applyPluginList(liveUrls, deadUrls, accountKeys);
    });
  },

  applyPluginList: function (liveUrls, deadUrls, accountKeys) {
    try {
      var plugins = Lampa.Plugins.get();
      var accountHasLive = false;
      var remove = [];
      var live = [];
      var changed = false;

      for (var a = 0; a < liveUrls.length; a++) {
        if (accountKeys.indexOf(liveUrls[a]) !== -1) accountHasLive = true;
      }

      for (var i = 0; i < plugins.length; i++) {
        var plugin = plugins[i];
        var key = pluginSetup.urlKey(plugin.url);

        if (deadUrls.indexOf(key) !== -1) {
          remove.push({ plugin: plugin, reason: 'dead' });
          continue;
        }

        if (liveUrls.indexOf(key) === -1) continue;

        if (accountHasLive) remove.push({ plugin: plugin, reason: 'cub' });
        else live.push({ plugin: plugin, key: key });
      }

      var keep = null;

      for (var k = 0; k < live.length; k++) {
        if (keep === null || liveUrls.indexOf(live[k].key) < liveUrls.indexOf(keep.key)) keep = live[k];
      }

      for (var d = 0; d < live.length; d++) {
        if (live[d] !== keep) remove.push({ plugin: live[d].plugin, reason: 'dup' });
      }

      if (keep && String(keep.plugin.descr || '').trim() !== '') {
        keep.plugin.descr = '';
        keep.plugin.name = "MODS's";
        changed = true;
      }

      for (var r = 0; r < remove.length; r++) {
        if (!keep && !accountHasLive && r === 0) {
          keep = { plugin: remove[r].plugin, key: liveUrls[0] };
          keep.plugin.url = (window.location.protocol === 'https:' ? 'https://' : 'http://') + liveUrls[0];
          changed = true;
          console.log('Modss', 'plugin url', 'moved to ' + keep.plugin.url);
          continue;
        }

        console.log('Modss', 'plugin url', 'removed [' + remove[r].reason + '] ' + remove[r].plugin.url);
        Lampa.Plugins.remove(remove[r].plugin);
      }

      if (changed) Lampa.Plugins.save();
    } catch (eClean) {
      console.error('Modss', 'plugin url', 'clean error', eClean && eClean.message ? eClean.message : String(eClean));
    }
  }
};


        var Protocol = function Protocol() {
            return window.location.protocol == 'https:' ? 'https://' : 'http://';
        }
        var TRASH_R = ['$$$####!!!!!!!', '^^^^^^##@', '@!^^!@#@@$$$$$', '^^#@@!!@#!$', '@#!@@@##$$@@'];
        var version_modss = '3.1.0', API = Protocol() + 'api.lampa.stream/', type = '', jackets = {}, cards, ping_auth, manifest, menu_list = [], vip = false, leftVipD = '', user_id = '', uid = '01c7d096cf6bb0d0d167947a2_334a280a328b1c6f4fc76491', IP, logged = undefined, cashe = encodeURIComponent(Lampa.Base64.encode(window.location.origin));

        var device_id = pluginSetup.resolveDeviceId('1a1f55cdc5a96f8bdd3e02921beb95bb');
        
        var urls = [
          Protocol() + 'lampa.stream/modss',
          Protocol() + 'modss.tv'
        ];

        console.log('Modss', 'protocol:', Protocol());
        console.log('Modss', 'origin', window.location.origin);
        console.log('Modss', 'plugin', '[VERSION] ' + version_modss);
        pluginSetup.logDevice("pc", device_id, function (next) {
          device_id = next;
          if (requestData) requestData.device_id = next;
        });
        console.log('Modss', 'init', 'LOADED - NL [185.229.191.43] - [GET] ' + urls[0]);
        window.loaded_modss = true;
        
        var network = new Lampa.Reguest();
        var currentUrlIndex = 0;
        var loadErrors = [];
        var requestData = {
          user_id: user_id, 
          uid: uid,
          ips: '185.229.191.43',
          cas: cashe,
          cache: false,
          id: '',
          or: 'dW5kZWZpbmVk',
          auth: logged,
          device_id: device_id
        };
        
        function tryNextUrl() {
          if (currentUrlIndex >= urls.length) {
            var statusCodes = loadErrors.map(function(e) { return String(e.status != null ? e.status : '?'); }).join(', ');
            console.log('Modss', 'init', 'NL [185.229.191.43] - все URL недоступны. Статусы ответов:', statusCodes, loadErrors);
            Lampa.Noty.show('NL [185.229.191.43] - MODSs ОШИБКА ЗАГРУЗКИ ПЛАГИНА -> все серверы недоступны.<br>Статусы: ' + (statusCodes || '—') + '<br>Lampa: ' + window.location.origin, {time: 10000});
            window.loaded_modss = false;
            return;
          }
          
          var currentUrl = urls[currentUrlIndex];
          var attemptNumber = currentUrlIndex + 1;
          console.log('Modss', 'init', '[POST] Попытка ' + attemptNumber + '/' + urls.length + ' - загрузки:', currentUrl);
          if(attemptNumber > 1) Lampa.Noty.show('Modss - init [POST] Попытка ' + attemptNumber + '/' + urls.length + ' - загрузки: ' + currentUrl, {time: 6000});
          
          network.timeout(30000);
          network.silent(currentUrl, function(json) {
            try {
              console.log('Modss', 'push', 'START - ' + currentUrl);
              new Function(json + '\n//# sourceURL=' + window.location.origin + '/plugin_modss.js')();
              window.loaded_modss = true;
            } catch (error) {
              Lampa.Noty.show('MODSs ОШИБКА ЗАГРУЗКИ -> ' + error.message);
              console.log('Modss', 'init', 'ERROR - ' + currentUrl, error.message);
              console.error('Ошибка выполнения кода:', error);
              currentUrlIndex++;
              tryNextUrl();
            }
          }, function(a, c) {
            var errMsg = network.errorDecode(a, c);
            var statusNum = typeof a === 'number' ? a : (a && (a.status !== undefined ? a.status : (a.statusCode !== undefined ? a.statusCode : null)));
            if (statusNum === undefined || statusNum === null) statusNum = '?';
            loadErrors.push({ url: currentUrl, status: statusNum, message: errMsg || '' });
            console.log('Modss', 'init', 'NL [185.229.191.43] - load get plugin error - [POST] ' + currentUrl, 'status:', statusNum, errMsg);
            if (statusNum === 444 || statusNum === 403) {
              console.error('Modss', 'init', 'ERROR - BLOCKED (status ' + statusNum + ')');
              Lampa.Noty.show('MODSs BLOCKED — ' + (errMsg || statusNum), {time: 8000});
              window.loaded_modss = false;
              return;
            }
            currentUrlIndex++;
            tryNextUrl();
          }, requestData, {
            dataType: 'text'
          });
        }
        
        tryNextUrl();
      })();
    }