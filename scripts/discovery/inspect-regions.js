'use strict';
const regions=['abruzzo','basilicata','campania','emilia-romagna','lazio','lombardia','marche','molise','piemonte','puglia','toscana','umbria','veneto'];
const base='https://sos-italia.net/rete/';
(async()=>{
 for(const name of regions){
  try{
   const response=await fetch(new URL(name+'/',base),{signal:AbortSignal.timeout(9000)});
   const html=await response.text();
   const tags=[...html.matchAll(/<[^>]*(?:mesh-qr-card|region-channel-link|region-channel-text-link)[^>]*>/gi)].map(x=>x[0].replace(/(?:https:\/\/meshtastic\.org\/e\/#)[A-Za-z0-9_-]+/g,'$1[REDACTED]').slice(0,450));
   const scripts=[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(x=>x[1]);
   const inline=[...html.matchAll(/(?:fetch\(|region-channel-link|region-channel-text-link|regionStatus|region_status|region-status|sos-region|regions\.json|api\/regions)/gi)].map(m=>html.slice(Math.max(0,m.index-75),m.index+120).replace(/(?:https:\/\/meshtastic\.org\/e\/#)[A-Za-z0-9_-]+/g,'$1[REDACTED]')).slice(0,9);
   console.log(JSON.stringify({region:name,status:response.status,bytes:html.length,tags:tags.slice(0,5),scripts:scripts.slice(-10),inline}));
  }catch(e){console.log(JSON.stringify({region:name,error:e.message}))}
 }
})().catch(e=>{console.error(e);process.exitCode=1});