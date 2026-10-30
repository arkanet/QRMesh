'use strict';
const crypto=require('node:crypto');
const fingerprint=key=>crypto.createHash('sha256').update(key).digest('hex');
function observe(state,catalog,candidates,now){
 const entries=structuredClone(state?.entries||{}),byName=new Map(catalog.channels.map(c=>[JSON.stringify([c.community,c.name.toLowerCase()]),c]));
 const enriched=[];
 for(const item of candidates){
  const c={...item};if(c.state!=='APPROVED'||c.approvalBasis!=='VERIFIED_COMMUNITY_SOURCE'||c.communityVerified!==true||c.officialSourceVerified!==true||c.conflict||!c.key){enriched.push(c);continue}
  const id=JSON.stringify([c.community,c.name.toLowerCase()]),current=byName.get(id),hash=fingerprint(c.key),prior=entries[id];
  if(prior?.fingerprint===hash){if(prior.lastSeenAt!==now)prior.scans++;prior.lastSeenAt=now}
  else {entries[id]={fingerprint:hash,scans:1,firstSeenAt:now,lastSeenAt:now,previous:prior&&current&&prior.fingerprint===fingerprint(current.key)?{fingerprint:prior.fingerprint,lastSeenAt:prior.lastSeenAt}:null}}
  const evidence=entries[id];
  if(current&&current.key!==c.key&&evidence.previous?.fingerprint===fingerprint(current.key)&&evidence.scans>=2&&Date.parse(evidence.firstSeenAt)>Date.parse(evidence.previous.lastSeenAt)){
   c.rotationEvidence={previousFingerprint:evidence.previous.fingerprint,currentFingerprint:hash,firstSeenAt:evidence.firstSeenAt,previousLastSeenAt:evidence.previous.lastSeenAt,confirmedScans:evidence.scans};
  }
  enriched.push(c);
 }
 return {state:{schemaVersion:1,entries},candidates:enriched};
}
module.exports={observe,fingerprint};
