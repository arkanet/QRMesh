'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {research}=require('./public-discovery');
const {importApproved}=require('./catalog-import');
const {observe}=require('./key-observations');
async function main(){
 const catalog=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
 const config=JSON.parse(fs.readFileSync('data/discovery-config.json','utf8'));
 const scan=await research(config,{communities:catalog.communities});
 assert.ok(scan.summary.pages>0,'no public pages');
 const first=importApproved(catalog,scan.candidates);
 const second=importApproved(first.catalog,scan.candidates);
 assert.equal(second.added.length,0,'second import must add zero channels');
 assert.equal(second.updated.length,0,'second import must update zero channels');
 assert.deepEqual(second.catalog,first.catalog,'second import must preserve catalog');assert.equal(second.profilesAdded.length,0,'second import must not duplicate LoRa profiles');
 assert.ok(first.catalog.channels.length>=catalog.channels.length,'catalog must not shrink');
 assert.equal(first.catalog.channels.length,catalog.channels.length+first.added.length,'each added channel must have exactly one record');
 const ids=new Set(first.catalog.communities.map(c=>c.id));
 for(const ch of first.catalog.channels)assert.ok(ids.has(ch.community),'orphan channel');
 const fingerprints=new Set();
 for(const ch of first.catalog.channels){const id=JSON.stringify([ch.community,ch.name.toLowerCase()]);assert.ok(!fingerprints.has(id),'duplicate channel '+id);fingerprints.add(id)}
 const approved=scan.candidates.filter(c=>c.state==='APPROVED');
 for(const ch of approved){const inCatalog=first.catalog.channels.find(x=>x.community===ch.community&&x.name.toLowerCase()===ch.name.toLowerCase());if(inCatalog&&inCatalog.key!==ch.key)assert.ok(first.conflicts.some(x=>x.community===ch.community&&x.name===ch.name),'unreported PSK conflict')}
 const now=new Date().toISOString();const state=observe({},catalog,scan.candidates,now);
 const after=importApproved(catalog,state.candidates);
 assert.equal(after.updated.length,0,'unknown historical keys must not be replaced on first scan');
 const report={before:catalog.channels.length,after:first.catalog.channels.length,added:first.added,updated:first.updated,conflicts:first.conflicts,approved:approved.length,profilesAdded:first.profilesAdded,secondProfilesAdded:second.profilesAdded.length,pages:scan.summary.pages,candidates:scan.candidates.length,secondImport:{added:second.added.length,updated:second.updated.length,unchanged:true},firstObservation:{rotations:after.updated.length}};
 fs.mkdirSync('audit-output',{recursive:true});fs.writeFileSync('audit-output/prepublish.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e);process.exitCode=1});
