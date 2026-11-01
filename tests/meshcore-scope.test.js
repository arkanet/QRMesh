'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const catalog=require('../data/catalog.json');
const bot=fs.readFileSync(path.join(__dirname,'../api/telegram.js'),'utf8');
const web=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('catalog only exposes scoped suggestions for MeshCore community',()=>{
 const italy=catalog.communities.find(c=>c.id==='meshcoreitalia');
 assert.deepEqual(italy.regionalScopes,['it','it-laz','it-pug','it-pug-le']);
 assert.ok(italy.regionalScopesSource.startsWith('https://'));
});
test('web exposes none, known, manual and QR parameter',()=>{
 for(const id of ['scopeMode','scopeKnown','scopeManualWrap'])assert.ok(web.includes('id="'+id+'"'));
 assert.match(web,/region_scope=/);
 assert.match(web,/encodeURIComponent\(getScope\(\)\)/);
});
test('bot offers scoped and unscoped QR with force reply',()=>{
 assert.match(bot,/function scopeKeyboard/);
 assert.match(bot,/function validScope/);
 assert.match(bot,/force_reply:true/);
 assert.match(bot,/region_scope=/);
 assert.match(bot,/function deliverMeshCore/);
 assert.match(bot,/if\(choice==='none'\)/);
});
