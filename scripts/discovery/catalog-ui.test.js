'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const catalog=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const single=fs.readFileSync('index.html','utf8');
const multi=fs.readFileSync('multicanale.html','utf8');
function inlineJs(html){const parts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];return parts.map(x=>x[1]).join('\n')}
test('SINGLE and MULTI share the same catalog source',()=>{
  assert.match(single,/fetch\('\.\/data\/catalog\.json'/);
  assert.match(multi,/fetch\('\.\/data\/catalog\.json'/);
  assert.match(single,/communityDirectory=data\.communities/);
  assert.match(multi,/communities=data\.communities/);
  assert.doesNotMatch(single,/const loraKey=/);
});
test('catalog community without approved channels remains hidden',()=>{
  const c=catalog.communities.find(c=>c.id==='sositalia');
  assert.ok(c);
  assert.equal(c.protocol,'meshtastic');
  assert.equal(catalog.channels.some(ch=>ch.community===c.id),false);
  assert.match(single,/filter\(c=>ids\.has\(c\.id\)\)/);
  assert.match(multi,/ids\.has\(c\.id\)/);
});
test('unapproved LoRa profiles cannot appear in MULTI selector',()=>{
  assert.match(multi,/p\.verified===true/);
});
test('inline SINGLE and MULTI scripts parse as JavaScript',()=>{
  assert.doesNotThrow(()=>new vm.Script(inlineJs(single)));
  assert.doesNotThrow(()=>new vm.Script(inlineJs(multi)));
});
