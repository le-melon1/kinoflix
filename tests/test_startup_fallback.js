const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('static/app.js', 'utf8');
const code = source.slice(source.indexOf('async function tryNextStartupRelease('), source.indexOf('\nasync function startNetflixStream('));
async function check() {
  const old = {id:'old', audio:'Дубляж'};
  const wrongAudio = {id:'other', audio:'Оригинал'};
  const suitable = {id:'next', audio:'Дубляж'};
  const state = {fallbackEnabled:true, playbackSequence:3, attemptedReleases:[old], modalAllResults:[old, wrongAudio, suitable], activeTorrentHash:'abc'};
  const calls = [];
  const ctx = {state, clearTimeout:()=>{}, sameRelease:(a,b)=>a.id===b.id, fetch:async()=>({}), showToast:()=>{}, startNetflixStream:(item,...args)=>calls.push([item,...args])};
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  assert.equal(await ctx.tryNextStartupRelease(old, 3), true);
  assert.equal(calls[0][0].id, 'next');
  assert.equal(state.activeTorrentHash, null);
  assert.equal(await ctx.tryNextStartupRelease(old, 2), false);
  state.attemptedReleases.push(suitable);
  assert.equal(await ctx.tryNextStartupRelease(old, 3), false);
  // Closing or starting another film during the stop request must cancel the retry.
  state.attemptedReleases = [old];
  state.activeTorrentHash = 'abc';
  ctx.fetch = async () => { state.playbackSequence++; return {}; };
  assert.equal(await ctx.tryNextStartupRelease(old, 3), false);
  assert.equal(calls.length, 1);
  console.log('Startup fallback checks passed');
}
check().catch(e=>{console.error(e);process.exitCode=1});
