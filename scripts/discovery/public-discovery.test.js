'use strict';
const test=require('node:test'),assert=require('node:assert/strict');const {research,reconcile,anchors}=require('./public-discovery');
const cfg={keywords:{protocol:['meshtastic'],channels:['channel','canali'],community:['mesh community']},maxPages:20,maxDepth:3,maxLinksPerPage:10,minimumIndependentSources:3,agreementRatio:.75};
test('public official directory discovers independent community site without login',async()=>{const seeds=[{url:'https://meshtastic.org/docs/community/local-groups/',protocol:'meshtastic',kind:'official-directory'}];const urls=[];const fetchPage=async url=>{urls.push(url);return {ok:true,headers:new Map([['content-type','text/html']]),text:async()=>url.includes('meshtastic.org')?'<a href="https://alpha-mesh.example.org/channels">Alpha Mesh community</a>':'<p>Welcome</p>'}};const r=await research(cfg,{fetchPage,seeds});assert.equal(r.summary.pages,2);assert.equal(urls.length,2);assert.equal(r.summary.approved,0)});
test('3 matching independent sources of 4 approve without conflict',()=>{const observations=['a.org','b.org','c.org'].map(host=>({protocol:'meshtastic',community:'demo',name:'Main',keyFingerprint:'abc',directoryAttested:true,sourceUrl:'https://'+host+'/'}));observations.push({protocol:'meshtastic',community:'demo',name:'Main',keyFingerprint:'abc',sourceUrl:'https://www.a.org/rete/'});const r=reconcile(observations);assert.equal(r[0].state,'APPROVED');assert.equal(r[0].independentDomains,3);assert.equal(r[0].sourceCount,3)});
test('missing source or conflicting PSK never automatically approves',()=>{const a=['a.org','b.org','c.org','d.org'].map((host,i)=>({protocol:'meshtastic',community:'demo',name:'Main',keyFingerprint:i===3?'xyz':'abc',directoryAttested:true,sourceUrl:'https://'+host+'/'}));assert.equal(reconcile(a)[0].state,'REVIEWED');assert.equal(reconcile(a.slice(0,2))[0].state,'REVIEWED')});
test('unsafe links are excluded from discovery',()=>{const links=anchors('<a href="http://example.com">bad</a><a href="/%24%7Bpost.url%7D">placeholder</a><a href="/rete/">rete</a>','https://example.org/');assert.equal(links.length,1)});

test('public search seeds derive from keyword configuration without credentials',()=>{const {searchSeeds}=require('./public-discovery');const seeds=searchSeeds(cfg);assert.equal(seeds.length,4);assert.ok(seeds.every(x=>x.url.startsWith('https://www.bing.com/search?')));assert.ok(seeds.every(x=>!x.url.includes('api_key')));assert.ok(decodeURIComponent(seeds[0].url).includes('community'))});
test('public RSS results are discovery only, never official attestations',async()=>{const seeds=[{protocol:'meshtastic',url:'https://www.bing.com/search?q=meshtastic&format=rss',kind:'search-rss'}];const fetchPage=async url=>({ok:true,headers:new Map([['content-type',url.includes('bing.com')?'application/rss+xml':'text/html']]),text:async()=>url.includes('bing.com')?'<rss><item><title>Community</title><link>https://mesh.example.org/community</link></item></rss>':'<a href="/channels">Channels</a>'});const result=await research(cfg,{fetchPage,seeds});assert.equal(result.summary.approved,0);assert.ok(result.pages.some(x=>x.url.includes('mesh.example.org')))});

test('same channel name on unrelated communities cannot form quorum',()=>{const a=['alpha.org','beta.org','gamma.org'].map(host=>({protocol:'meshtastic',community:host,name:'Emergency',keyFingerprint:'same',sourceUrl:'https://'+host+'/',directoryAttested:true}));const candidates=reconcile(a);assert.equal(candidates.length,3);assert.ok(candidates.every(x=>x.state!=='APPROVED'))});
test('irrelevant login, marketing and account links never enter crawl queue',()=>{const {excludedPage,publicMeshcore}=require('./public-discovery');for(const path of ['https://en.wikipedia.org/w/index.php?title=Special:UserLogin','https://vercel.com/?utm_source=meshtastic','https://example.org/account/login','https://flasher.meshtastic.org/flasher/']){if(path.includes('flasher.meshtastic.org/flasher/'))continue;assert.equal(excludedPage(path),true,path)}assert.equal(publicMeshcore('<h3>A:</h3><code>0123456789abcdef0123456789abcdef</code>').length,0)});

test('official community links to external public channel pages preserve identity, not ownership attestation',async()=>{const seeds=[{url:'https://meshtastic.org/docs/community/local-groups/',protocol:'meshtastic',kind:'official-directory'}];const urls=[];const fetchPage=async url=>{urls.push(url);let html='';if(url.includes('meshtastic.org'))html='<a href="https://group.example.org/">Group Meshtastic community</a>';else if(url==='https://group.example.org/')html='<a href="https://pages.example.net/channels">Channel config QR join</a>';return {ok:true,headers:new Map([['content-type','text/html']]),text:async()=>html}};const r=await research(cfg,{fetchPage,seeds});assert.ok(urls.includes('https://pages.example.net/channels'));assert.equal(r.summary.approved,0)});

test('verified community official source approves one technically valid channel without quorum',()=>{const items=[{protocol:'meshtastic',community:'known',name:'Unique',keyFingerprint:'fp',key:'AQ==',sourceUrl:'https://known.example.org/channels',directoryAttested:true,communityVerified:true,officialSource:true}];const r=reconcile(items);assert.equal(r[0].state,'APPROVED');assert.equal(r[0].approvalBasis,'VERIFIED_COMMUNITY_SOURCE');assert.equal(r[0].sourceCount,1)});
test('same lone candidate from unreferenced or external site stays pending',()=>{const base={protocol:'meshtastic',community:'unknown',name:'Unique',keyFingerprint:'fp',key:'AQ==',sourceUrl:'https://unknown.example.org/channels'};assert.notEqual(reconcile([base])[0].state,'APPROVED');assert.notEqual(reconcile([{...base,community:'known',directoryAttested:true,communityVerified:true,officialSource:false}])[0].state,'APPROVED')});
test('conflicting keys on verified community site block automatic approval',()=>{const base={protocol:'meshtastic',community:'known',name:'Unique',keyFingerprint:'one',key:'AQ==',sourceUrl:'https://known.example.org/channels',directoryAttested:true,communityVerified:true,officialSource:true};const r=reconcile([base,{...base,keyFingerprint:'two'}]);assert.notEqual(r[0].state,'APPROVED');assert.equal(r[0].conflict,true)});
test('registered community seeds retain authoritative domain and community identity',()=>{const {registeredSeeds}=require('./public-discovery');const s=registeredSeeds([{id:'alpha',protocol:'meshtastic',resources:[{url:'https://alpha.example.org/'},{url:'https://t.me/alpha'}]}]);assert.equal(s.length,1);assert.equal(s[0].community,'alpha');assert.equal(s[0].officialDomain,'alpha.example.org')});

test('published regional links are discovered under the verified community',async()=>{
 const {regionalLinks}=require('./public-discovery');
 const html='<h3>Regioni pubbliche</h3><ul><li>Abruzzo — rete pilota</li><li>Puglia — rete regionale in attivazione</li></ul><p>Le altre regioni sono predisposte per l’attivazione progressiva.</p>';
 const links=regionalLinks(html,'https://sos-italia.net/rete/');assert.equal(links.length,20);assert.ok(links.some(x=>x.url==='https://sos-italia.net/rete/abruzzo/'));assert.ok(links.some(x=>x.url==='https://sos-italia.net/rete/puglia/'));
 assert.deepEqual(regionalLinks(html,'https://unrelated.example.net/about/'),[]);
});
test('regional page retains verified community identity and imports a real channel when decoded',async()=>{
 const {research}=require('./public-discovery');
 const html='<h3>Regioni pubbliche</h3><p>Abruzzo — rete pilota.</p><p>Le altre regioni saranno attivate.</p>';
 const urls=[];
 const fetchPage=async url=>{urls.push(url);return {ok:true,headers:new Map([['content-type','text/html']]),text:async()=>url.endsWith('/rete/')?html:'<h1>Canale SOS-Abruzzo</h1>'}};
 const seeds=[{url:'https://sos-italia.net/rete/',protocol:'meshtastic',community:'sositalia',kind:'registered-community',communityVerified:true,directoryAttested:true,officialDomain:'sos-italia.net'}];
 const result=await research(cfg,{fetchPage,seeds});
 assert.ok(urls.includes('https://sos-italia.net/rete/abruzzo/'));
 assert.equal(result.summary.approved,0);
});

test('dynamic regional probes inspect hidden sublevels without treating 404 as valid',async()=>{
 const html='<h2>Reti regionali</h2><p>La mappa carica lo stato regioni dal database centrale.</p>';
 const seen=[];
 const seeds=[{url:'https://community.example.org/network/',protocol:'meshtastic',community:'demo',kind:'registered-community',communityVerified:true,directoryAttested:true,officialDomain:'community.example.org'}];
 const fetchPage=async url=>{seen.push(url);return {ok:!url.endsWith('/molise/'),status:404,headers:new Map([['content-type','text/html']]),text:async()=>html}};
 const r=await research({...cfg,maxPages:50},{seeds,fetchPage});
 assert.ok(seen.includes('https://community.example.org/network/lazio/'));
 assert.ok(seen.includes('https://community.example.org/network/molise/'));
 assert.equal(r.summary.approved,0);
 assert.ok(r.errors.some(e=>e.url.endsWith('/molise/')));
});

test('regional channel selectors identify card and both link types',()=>{
 const {structuredChannelLinks}=require('./public-discovery');
 const html='<section class="mesh-qr-card"><a id="region-channel-link" href="https://meshtastic.org/e/#Abcd123456789">QR</a><a class="region-channel-text-link" href="https://meshtastic.org/e/#Abcd123456789">Apri</a></section>';
 const r=structuredChannelLinks(html);
 assert.equal(r.card,true);
 assert.deepEqual(r.links,['https://meshtastic.org/e/#Abcd123456789']);
});
test('structural marker without decodable link never approves a channel',async()=>{
 const seeds=[{url:'https://community.example.org/network/',protocol:'meshtastic',community:'c',kind:'registered-community',communityVerified:true,officialDomain:'community.example.org',directoryAttested:true}];
 const fetchPage=async()=>({ok:true,headers:new Map([['content-type','text/html']]),text:async()=>'<div class="mesh-qr-card"><a class="region-channel-link" href="#">Open</a></div>'});
 const r=await research({...cfg,maxPages:1},{seeds,fetchPage});
 assert.equal(r.summary.approved,0);
 assert.equal(r.pages[0].channelCard,true);
 assert.equal(r.pages[0].channelLinks,1);
});

test('Meshtastic links accept query parameters and uppercase E endpoint',()=>{
 const {importLinks}=require('./public-discovery');
 const sample='CjYSIA0mJI8VCEV3g4zY3NciCp6hWOZJbsCW9xxydModBCeJGgpTT1MtUHVnbGlhKAEwAToCCCASGAgBEAQY-gEgCygFOANABUgBUBtoAcgGAQ';
 const plain=importLinks('https://meshtastic.org/e/#'+sample);
 const query=importLinks('<a href="https://meshtastic.org/e/?add=true#'+sample+'">Canale</a>');
 const upper=importLinks('<a id="region-channel-link" href="https://meshtastic.org/E/#'+sample+'">Canale</a>');
 assert.equal(query.length,1);
 assert.equal(upper.length,1);
 assert.equal(query[0].name,'SOS-Puglia');
 assert.equal(query[0].key,upper[0].key);
 assert.equal(plain[0].key,query[0].key);
});
