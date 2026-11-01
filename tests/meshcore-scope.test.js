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
 assert.ok(italy.regionalScopes.includes('it-laz'));
 assert.ok(italy.regionalScopesSource.startsWith('https://'));
});
test('web exposes none, known, manual and QR parameter',()=>{
 for(const id of ['scopeMode','scopeGroup','scopeManualWrap'])assert.ok(web.includes('id="'+id+'"'));
 assert.match(web,/region_scope=/);
 assert.match(web,/encodeURIComponent\(getScope\(\)\)/);
});
test('bot offers scoped and unscoped QR with force reply',()=>{
 assert.match(bot,/function scopeKeyboard/);
 assert.match(bot,/function validScope/);
 assert.match(bot,/force_reply:true/);
 assert.match(bot,/region_scope=/);
 assert.match(bot,/function deliverMeshCore/);
 assert.match(bot,/arg==='none'/);
});

const geo=require('../data/italy-regional-scopes.json');
test('Italy has three macroareas, 20 regions and 107 provinces',()=>{
 assert.deepEqual(geo.groups.map(g=>g.name),['Nord','Centro e Sardegna','Sud e Sicilia']);
 const regions=geo.groups.flatMap(g=>g.regions);
 assert.equal(regions.length,20);
 assert.equal(regions.reduce((n,r)=>n+r.provinces.length,0),107);
 assert.equal(new Set(regions.map(r=>r.code)).size,20);
 assert.ok(regions.find(r=>r.code==='laz').provinces.some(p=>p.code==='rm'));
});
test('bot has hierarchical navigation and region-only and province scopes',()=>{
 for(const prefix of ['rs:','rg:','rr:','rp:'])assert.ok(bot.includes(prefix));
 assert.match(bot,/groupScopeKeyboard/);
 assert.match(bot,/regionScopeKeyboard/);
 assert.match(bot,/provinceScopeKeyboard/);
 assert.match(bot,/it-'\+arg\+'-'\+extra/);
});
test('web offers Italian macroarea region and province selectors',()=>{
 for(const id of ['scopeGroup','scopeRegion','scopeProvince','scopeBack','scopeCountry'])assert.ok(web.includes('id="'+id+'"'));
 assert.match(web,/italy-regional-scopes\.json/);
});
