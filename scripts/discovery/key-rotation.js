'use strict';
function timestamp(value){if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value))return null;const t=Date.parse(value);return Number.isFinite(t)&&new Date(t).toISOString().slice(0,19)===value.slice(0,19)?t:null}
function canRotate(current,candidate){
 const newDate=timestamp(candidate.publishedAt),oldDate=timestamp(current.publishedAt||current.verifiedAt);
 if(!newDate||!oldDate||newDate<=oldDate)return {ok:false,reason:'unverified-chronology'};
 if(candidate.state!=='APPROVED'||!candidate.key||!candidate.name||!candidate.community)return {ok:false,reason:'unapproved'};
 if(candidate.conflict===true||candidate.rotationConflict===true)return {ok:false,reason:'conflicting-evidence'};
 if(!Array.isArray(candidate.sourceUrls)||candidate.sourceUrls.length===0)return {ok:false,reason:'missing-evidence'};
 if(candidate.approvalBasis==='VERIFIED_COMMUNITY_SOURCE'){
  if(candidate.communityVerified!==true||candidate.officialSourceVerified!==true)return {ok:false,reason:'unverified-official-source'};
 }else if(candidate.approvalBasis==='INDEPENDENT_QUORUM'){
  if(candidate.communityVerified!==true||candidate.sourceCount<candidate.required||candidate.independentDomains<3)return {ok:false,reason:'insufficient-quorum'};
 }else return {ok:false,reason:'unverified-source'};
 return {ok:true,reason:'newer-verified-key'};
}
module.exports={canRotate,timestamp};
