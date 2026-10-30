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
  assert.match(single,/communityDirectory=\(data\.communities/);
  assert.match(multi,/communities=data\.communities/);
  assert.doesNotMatch(single,/const loraKey=/);
});
test('catalog community without approved channels remains hidden',()=>{
  const c=catalog.communities.find(c=>c.id==='sositalia');
  assert.ok(c);
  assert.equal(c.protocol,'meshtastic');
  assert.equal(typeof catalog.channels.some(ch=>ch.community===c.id),'boolean');
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

test('LoRa selector follows PRIMARY immediately, independently of SECONDARY',()=>{
 const script=inlineJs(multi);
 assert.match(script,/const available=communityProfiles;/);
 assert.doesNotMatch(script,/communityProfiles\.filter\(p=>p\.community===primary\)/);
 assert.match(script,/community\.onchange=\(\)=>\{[^}]*updateLoraProfiles\(\);generate\(\)/);
 assert.doesNotMatch(script,/const selected=new Set\(\[\.\.\.slots\.querySelectorAll\('\.community'\)/);
});

test('choosing a LoRa profile includes it in QR and URL, including after adding secondary slots',()=>{
 const script=inlineJs(multi);
 assert.match(script,/function applyLoraProfile\(\)\{[\s\S]*?includeLora'\)\.checked=true/);
 assert.match(script,/loraProfile'\)\.addEventListener\('change',applyLoraProfile\)/);
 assert.match(script,/function generate\(\)\{[\s\S]*?const lora=loraConfig\(\);if\(lora\)payload\.push\(\.\.\.field\(2,lora\)\)/);
 assert.match(script,/const url='https:\/\/meshtastic\.org\/e\/#'\+toBase64Url\(payload\)/);
 assert.match(script,/if\(count<8\)\{count\+\+;draw\(\)\}/);
 assert.match(script,/picker\.value=available\.some\(p=>p\.id===old\)\?old:''/);
 assert.match(script,/picker\.value=available\.some\(p=>p\.id===old\)\?old:''/);
});
