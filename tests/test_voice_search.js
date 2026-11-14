const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync('static/app.js','utf8');
const code = src.slice(src.indexOf('let _voiceRecog = null;'), src.indexOf('\nasync function launchMovieDirectly('));
const elements = new Map();
function element(id) { if (!elements.has(id)) elements.set(id, {style:{display:id==='voiceModal'?'flex':''},textContent:'',value:'',classList:{toggle(){},add(){}},focus(){}}); return elements.get(id); }
let searched = null;
class Recognition { start() {} abort() {} }
const ctx = {window:{SpeechRecognition:Recognition}, document:{getElementById:element}, console, setTimeout, clearTimeout,
  netflixSearchInput:{value:''},searchBox:{classList:{add(){}}},searchClearBtn:{style:{}},performSearch:q=>{searched=q;}};
vm.createContext(ctx); vm.runInContext(code,ctx);
const recognition=ctx.initVoiceRecognition();
recognition.onresult({resultIndex:0,results:[Object.assign([{transcript:'Прибытие'}],{isFinal:true})]});
assert.equal(searched,'Прибытие');
assert.equal(ctx.netflixSearchInput.value,'Прибытие');
assert.equal(element('voiceModal').style.display,'none');
recognition.onerror({error:'audio-capture'});
assert.match(element('voiceStatusSubtitle').textContent,/Микрофон не найден/);
console.log('Voice search checks passed');
