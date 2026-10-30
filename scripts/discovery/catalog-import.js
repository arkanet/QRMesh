'use strict';
const {canRotate}=require('./key-rotation');
function importApproved(catalog,candidates){
 const next=structuredClone(catalog),added=[],updated=[],conflicts=[];const profilesAdded=[];const profiles=new Set((next.loraProfiles||[]).map(p=>JSON.stringify([p.community,p.lora])));
 const communities=new Map(next.communities.map(c=>[c.id,c]));
 const existing=new Map();
 for(const channel of next.channels)existing.set(JSON.stringify([channel.community,channel.name.toLowerCase()]),channel);
 for(const candidate of candidates){
  if(candidate.state!=='APPROVED'||typeof candidate.key!=='string'||!candidate.key||!candidate.community||!candidate.name)continue;
  const id=candidate.community;
  const key=JSON.stringify([id,candidate.name.toLowerCase()]);
  const current=existing.get(key);
  if(current){if(current.key!==candidate.key){const decision=canRotate(current,candidate);if(!decision.ok)conflicts.push({community:id,name:candidate.name,reason:decision.reason});else{current.keyHistory=[...(current.keyHistory||[]),{key:current.key,publishedAt:current.publishedAt||null,replacedAt:candidate.publishedAt}];current.key=candidate.key;current.publishedAt=candidate.publishedAt;current.sources=candidate.sourceUrls;current.approved=true;current.verification=candidate.approvalBasis==='VERIFIED_COMMUNITY_SOURCE'?'verified-community-source':'automatic-independent-sources';updated.push({community:id,name:candidate.name})}}continue}
  let community=communities.get(id);
  if(!community){
   if(candidate.approvalBasis!=='INDEPENDENT_QUORUM'||candidate.communityVerified!==true)continue;
   if(!Array.isArray(candidate.sourceUrls)||!candidate.sourceUrls.length)continue;
   community={id,name:id,protocol:candidate.protocol,resources:[{title:'Fonte',url:candidate.sourceUrls[0]}]};
   next.communities.push(community);communities.set(id,community);
  }
  if(community.protocol!==candidate.protocol)continue;
  const channel={community:id,name:candidate.name,key:candidate.key,approved:true,verification:candidate.approvalBasis==='VERIFIED_COMMUNITY_SOURCE'?'verified-community-source':'automatic-independent-sources',sources:candidate.sourceUrls||[],...(candidate.publishedAt?{publishedAt:candidate.publishedAt}:{})};
  next.channels.push(channel);existing.set(key,channel);added.push({community:id,name:candidate.name});
 }
 for(const candidate of candidates){if(candidate.state!=='APPROVED'||candidate.loraConflict||!candidate.lora||!communities.has(candidate.community))continue;const lora=candidate.lora;if(!Number.isInteger(lora.region)||!Number.isInteger(lora.modemPreset))continue;const signature=JSON.stringify([candidate.community,lora]);if(profiles.has(signature))continue;const crypto=require('node:crypto');const id=candidate.community+'-'+crypto.createHash('sha256').update(signature).digest('hex').slice(0,16);(next.loraProfiles||=[]).push({id,community:candidate.community,label:'Configurazione LoRa pubblicata',verified:false,verification:'pending-manual-review',sourceUrl:candidate.sourceUrls?.[0]||'',lora});profiles.add(signature);profilesAdded.push({community:candidate.community,id});}return {catalog:next,added,updated,conflicts,profilesAdded};
}
module.exports={importApproved};
