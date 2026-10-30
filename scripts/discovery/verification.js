'use strict';
const crypto=require('node:crypto');
const STATES=Object.freeze({DISCOVERED:'DISCOVERED',REVIEWED:'REVIEWED',APPROVED:'APPROVED'});
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const validStates=new Set(Object.values(STATES));
function evaluateCandidate(candidate,feeds,observations,options={}){
 if(!candidate||!candidate.community||!candidate.name||!candidate.keyFingerprint)throw Error('Invalid candidate');
 const eligible=feeds.filter(f=>f.community===candidate.community&&f.ownershipVerified===true&&f.enabled!==false&&f.id&&f.platform);
 const unique=new Map(eligible.map(f=>[f.id,f]));const registered=[...unique.values()];
 const byPlatform=new Set();const independent=[];
 for(const f of registered){const owner=f.operatorId||f.platform+':'+f.id;if(byPlatform.has(owner))continue;byPlatform.add(owner);independent.push(f)}
 const matches=[];const conflicts=[];
 for(const f of independent){const evidence=observations.filter(o=>o.feedId===f.id&&o.community===candidate.community&&o.name===candidate.name&&o.validated===true);
 const distinct=new Set(evidence.map(o=>o.keyFingerprint));if(distinct.size>1)conflicts.push(f.id);
 else if(distinct.has(candidate.keyFingerprint))matches.push(f.id);
 else if(distinct.size)conflicts.push(f.id);
 }
 const required=Math.max(3,Math.ceil(independent.length*.75));
 const quorum=independent.length>=3&&matches.length>=required&&conflicts.length===0;
 const technicalValid=candidate.technicalValid===true;
 const sourceVerified=candidate.sourceVerified===true;
 const state=technicalValid&&sourceVerified&&quorum?STATES.APPROVED:(technicalValid&&sourceVerified?STATES.REVIEWED:STATES.DISCOVERED);
 return {id:sha(JSON.stringify([candidate.community,candidate.name,candidate.keyFingerprint])).slice(0,20),community:candidate.community,name:candidate.name,keyFingerprint:candidate.keyFingerprint,state,decision:state===STATES.APPROVED?'AUTO_QUORUM':'PENDING_REVIEW',required,eligibleFeeds:independent.length,matchingFeeds:matches.length,matchedFeedIds:matches,conflictingFeedIds:conflicts,quorum,technicalValid,sourceVerified,publicationAllowed:false};
}
function decisionLog(previous,next,{actor,reason,at=new Date().toISOString()}={}){
 if(!validStates.has(previous)||!validStates.has(next))throw Error('Invalid state');
 if(next===STATES.APPROVED&&!reason)throw Error('Approval requires reason');
 if(!actor||!reason)throw Error('Audit requires actor and reason');
 return {from:previous,to:next,actor,reason,at};
}
module.exports={STATES,evaluateCandidate,decisionLog};
