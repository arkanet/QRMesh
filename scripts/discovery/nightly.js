'use strict';
const fs=require('node:fs');const {discover}=require('./scanner');
(async()=>{const path='data/catalog.json',reportPath='data/discovery-report.json';const input=JSON.parse(fs.readFileSync(path,'utf8'));const {catalog,report}=await discover(input);fs.writeFileSync(path,JSON.stringify(catalog,null,2)+'\n');fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(report.scanned&&report.errors.length===report.scanned)process.exitCode=1})().catch(e=>{console.error(e);process.exitCode=1});
