'use strict';
function auditGate({sourceReview,profiles}) {
  const errors=[];
  const seen=new Set();
  for(const candidate of sourceReview.candidates||[]){
    const signature=JSON.stringify([candidate.community,candidate.name,candidate.keyFingerprint,candidate.kind]);
    if(seen.has(signature))errors.push('duplicate candidate '+candidate.community+'/'+candidate.name);
    seen.add(signature);
    if(candidate.status!=='pending-review'||candidate.verified===true)errors.push('unapproved candidate '+candidate.community+'/'+candidate.name);
  }
  for(const p of profiles||[])if(p.verified===true||p.verification!=='pending-manual-review')errors.push('unapproved LoRa profile '+p.id);
  for(const page of sourceReview.pages||[])if(/\$\{|\{\{|%7b/i.test(page.url))errors.push('template URL '+page.url);
  for(const error of sourceReview.errors||[])if(/\$\{|\{\{|%7b/i.test(error.source||''))errors.push('template link fetched '+error.source);
  if(errors.length)throw Error('Discovery audit gate failed: '+errors.join('; '));
  return {passed:true,candidates:(sourceReview.candidates||[]).length,profiles:(profiles||[]).length};
}
module.exports={auditGate};
