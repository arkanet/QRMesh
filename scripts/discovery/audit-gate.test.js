'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {auditGate}=require('./audit-gate');
const base=()=>({sourceReview:{pages:[{url:'https://community.example.org/'}],candidates:[{community:'demo',name:'Alpha',keyFingerprint:'abcdef',kind:'meshtastic-import',status:'pending-review'}],errors:[]},profiles:[{id:'demo-profile',verified:false,verification:'pending-manual-review'}]});
test('audit gate accepts only review-pending distinct candidates',()=>assert.equal(auditGate(base()).passed,true));
test('audit gate rejects duplicate candidates',()=>{const r=base();r.sourceReview.candidates.push({...r.sourceReview.candidates[0],sourceUrl:'https://www.community.example.org/'});assert.throws(()=>auditGate(r),/duplicate candidate/)});
test('audit gate rejects accidental verified profiles',()=>{const r=base();r.profiles[0].verified=true;assert.throws(()=>auditGate(r),/unapproved LoRa profile/)});
test('audit gate rejects approval bypass and spurious template URLs',()=>{const r=base();r.sourceReview.candidates[0].status='verified';assert.throws(()=>auditGate(r),/unapproved candidate/);const x=base();x.sourceReview.errors.push({source:'https://community.example.org/\x24{post.url}',reason:'404'});assert.throws(()=>auditGate(x),/template link fetched/)});
