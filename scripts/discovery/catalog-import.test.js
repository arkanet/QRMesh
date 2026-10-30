'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const {importApproved}=require('./catalog-import');
const original=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
// Keep the import fixture independent of channels already added to the live catalog.
original.channels=original.channels.filter(c=>c.community!=='sositalia');
function candidate(extra={}){return {state:'APPROVED',community:'sositalia',protocol:'meshtastic',name:'SOS-Italia',key:'AQ==',approvalBasis:'VERIFIED_COMMUNITY_SOURCE',sourceUrls:['https://sos-italia.net/rete/'],...extra}}
test('approved channel from catalog community appears in shared catalog without duplicates',()=>{const first=importApproved(original,[candidate()]);assert.equal(first.added.length,1);assert.equal(first.catalog.channels.filter(x=>x.community==='sositalia').length,1);const second=importApproved(first.catalog,[candidate()]);assert.equal(second.added.length,0);assert.deepEqual(second.catalog,first.catalog)});
test('unapproved or isolated candidates never appear in SINGLE/MULTI catalog',()=>{const r=importApproved(original,[candidate({state:'DISCOVERED'}),candidate({community:'isolated',approvalBasis:'INDEPENDENT_QUORUM',communityVerified:false})]);assert.equal(r.added.length,0);assert.deepEqual(r.catalog,original)});
test('conflicting PSK on existing channel is blocked without overwrite',()=>{const first=importApproved(original,[candidate()]);const second=importApproved(first.catalog,[candidate({key:'Ag=='})]);assert.equal(second.added.length,0);assert.equal(second.conflicts.length,1);assert.equal(second.catalog.channels.find(x=>x.community==='sositalia').key,'AQ==')});
test('no orphan community created when candidate is not importable',()=>{const r=importApproved(original,[candidate({community:'orphan',approvalBasis:'INDEPENDENT_QUORUM',communityVerified:false})]);assert.equal(r.catalog.communities.some(x=>x.id==='orphan'),false)});
test('both UIs use catalog without showing empty communities',()=>{const single=fs.readFileSync('index.html','utf8'),multi=fs.readFileSync('multicanale.html','utf8');assert.match(single,/communityDirectory=\(data\.communities\|\|\[\]\)\.filter\(c=>ids\.has\(c\.id\)\)/);assert.match(multi,/communities=data\.communities\.filter\(c=>c\.protocol==='meshtastic'&&ids\.has\(c\.id\)\)/)});
