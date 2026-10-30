'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {STATES,evaluateCandidate,decisionLog}=require('./verification');
const c={community:'demo',name:'General',keyFingerprint:'abc123',technicalValid:true,sourceVerified:true};
const feed=(id,platform=id)=>({id,community:'demo',platform,ownershipVerified:true,operatorId:id});
const obs=(id,keyFingerprint='abc123')=>({feedId:id,community:'demo',name:'General',keyFingerprint,validated:true});
test('3 of 4 verified independent feeds qualifies for automatic approval decision',()=>{
 const r=evaluateCandidate(c,[feed('web'),feed('telegram'),feed('facebook'),feed('github')],[obs('web'),obs('telegram'),obs('facebook')]);
 assert.equal(r.state,STATES.APPROVED);assert.equal(r.required,3);assert.equal(r.matchingFeeds,3);assert.equal(r.publicationAllowed,false)
});
test('2 of 4 stays in pending review',()=>{const r=evaluateCandidate(c,[feed('a'),feed('b'),feed('c'),feed('d')],[obs('a'),obs('b')]);assert.equal(r.state,STATES.REVIEWED);assert.equal(r.decision,'PENDING_REVIEW')});
test('unverified social account and duplicate operator are not independent feeds',()=>{
 const feeds=[feed('web'),feed('telegram'),{...feed('mirror'),operatorId:'web'}, {...feed('fake'),ownershipVerified:false}];
 const r=evaluateCandidate(c,feeds,[obs('web'),obs('telegram'),obs('mirror'),obs('fake')]);assert.equal(r.eligibleFeeds,2);assert.equal(r.state,STATES.REVIEWED)
});
test('conflicting fingerprints block quorum regardless of 3 matching feeds',()=>{
 const r=evaluateCandidate(c,[feed('a'),feed('b'),feed('c'),feed('d')],[obs('a'),obs('b'),obs('c'),obs('d','changed')]);assert.equal(r.quorum,false);assert.equal(r.state,STATES.REVIEWED)
});
test('unvalidated and unverifiable evidence never passes',()=>{
 const r=evaluateCandidate({...c,technicalValid:false},[feed('a'),feed('b'),feed('c')],[obs('a'),obs('b'),obs('c')]);assert.equal(r.state,STATES.DISCOVERED);
 const f=evaluateCandidate(c,[feed('a'),feed('b'),feed('c')],[{...obs('a'),validated:false},obs('b'),obs('c')]);assert.equal(f.state,STATES.REVIEWED)
});
test('manual decisions produce accountable records',()=>{
 assert.throws(()=>decisionLog('REVIEWED','APPROVED',{actor:'reviewer'}));
 assert.equal(decisionLog('REVIEWED','APPROVED',{actor:'reviewer',reason:'verified official sources'}).to,'APPROVED')
});
