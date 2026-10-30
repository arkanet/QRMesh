const test=require('node:test'),assert=require('node:assert/strict');const {decodeMeshtastic}=require('./meshtastic-link');
const v=n=>{const a=[];while(n>127){a.push((n&127)|128);n=Math.floor(n/128)}return [...a,n]};
const f=(n,b)=>Buffer.from([...v(n*8+2),...v(b.length),...b]);
const i=(n,x)=>Buffer.from([...v(n*8),...v(x)]);
const url=(ch,lora)=>'https://meshtastic.org/e/#'+Buffer.concat([f(1,ch),...(lora?[f(2,lora)]:[])]).toString('base64url');
test('decodes explicit channel PSK and LoRa values',()=>{const ch=Buffer.concat([f(2,Buffer.from([1])),f(3,Buffer.from('SOS-Italia'))]);const d=decodeMeshtastic(url(ch,Buffer.concat([i(2,4),i(7,3),i(10,20)])));assert.deepEqual(d.channels,[{name:'SOS-Italia',key:'AQ=='}]);assert.deepEqual(d.lora,{modemPreset:4,region:3,txPower:20})});
test('does not invent absent fields',()=>{const d=decodeMeshtastic(url(f(3,Buffer.from('Test'))));assert.equal(d.lora,null);assert.equal(d.channels[0].key,null)});
test('rejects foreign URLs and invalid protobuf',()=>{assert.throws(()=>decodeMeshtastic('https://evil.test/e/#AQ'));assert.throws(()=>decodeMeshtastic('https://meshtastic.org/e/#CgQBAg'))});
