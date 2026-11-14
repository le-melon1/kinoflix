const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('static/app.js','utf8');
const code = source.slice(source.indexOf('function buildHomeRecommendations('),source.indexOf('\nfunction updateHomeRecommendations('));
const context = {}; vm.createContext(context); vm.runInContext(code, context);
const categories = [
  {id:'scifi', items:[{id:'seen',title:'Seen'}, {id:'like',title:'Liked'}, {id:'near',title:'Nearby'}]},
  {id:'comedy', items:[{id:'other',title:'Other'}]}
];
const output = context.buildHomeRecommendations(categories, [], [{id:'like'}], [{id:'seen'}], [], ()=>0.5);
assert.equal(output[0].id,'near');
assert.equal(output.some(x=>x.id==='like'||x.id==='seen'),false);
const rotated = context.buildHomeRecommendations(categories, [], [], [], ['near'], ()=>0.5);
assert.equal(rotated.at(-1).id,'near');
assert.equal(new Set(output.map(x=>x.title)).size,output.length);
console.log('Recommendation checks passed');
