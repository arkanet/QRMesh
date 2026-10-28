'use strict';
const catalog = require('../data/catalog.json');
const BASE = 'https://meshtastic.org/e/#';
const REGION_IDS = {US:1,EU_433:2,EU_868:3,CN:4,JP:5,ANZ:6,KR:7,TW:8,RU:9,IN:10,NZ_865:11,TH:12,LORA_24:13,UA_433:14,MY_433:16,MY_919:17,SG_923:18,PH_433:19,PH_868:20,PH_915:21,ANZ_433:22,KZ_433:23,KZ_863:24,NP_865:25,BR_902:26,ITU1_2M:27,ITU2_2M:28,EU_866:29,EU_N_868:32,ITU3_2M:33,ITU1_70CM:34,ITU2_70CM:35,ITU3_70CM:36,ITU2_125CM:37};
const LEGACY = 'US EU_433 EU_868 CN JP ANZ ANZ_433 RU KR TW IN NZ_865 TH UA_433 MY_433 MY_919 SG_923 PH_433 PH_868 PH_915 KZ_433 KZ_863 NP_865 BR_902 LORA_24'.split(' ');
const MODERN = 'US EU_433 EU_868 EU_866 EU_N_868 CN JP ANZ ANZ_433 RU KR TW IN NZ_865 TH UA_433 MY_433 MY_919 SG_923 PH_433 PH_868 PH_915 KZ_433 KZ_863 NP_865 BR_902 ITU1_2M ITU2_2M ITU3_2M ITU2_125CM ITU1_70CM ITU2_70CM ITU3_70CM LORA_24'.split(' ');
const PRESET_IDS = {LONG_FAST:0,MEDIUM_SLOW:3,MEDIUM_FAST:4,SHORT_SLOW:5,SHORT_FAST:6,LONG_MODERATE:7,SHORT_TURBO:8,LONG_TURBO:9,LITE_FAST:10,LITE_SLOW:11,NARROW_FAST:12,NARROW_SLOW:13};
const PRESETS = 'LONG_FAST MEDIUM_SLOW MEDIUM_FAST SHORT_SLOW SHORT_FAST LONG_MODERATE SHORT_TURBO LONG_TURBO'.split(' ');
const FW = ['Meshtastic 2.7.x','Meshtastic 2.8 / develop','DarkMesh 2.7.15 Ghost','DarkMesh 2.7.26'];
const MAX_CALLBACK = 64;
const v = n => { const out=[]; while(n>127){out.push((n&127)|128);n=Math.floor(n/128)}out.push(n);return Buffer.from(out) };
const bytes = (n,b) => Buffer.concat([v(n*8+2),v(b.length),b]);
const integer = (n,i) => Buffer.concat([v(n*8),v(i)]);
const allowedRegions = fw => fw===1?MODERN:LEGACY;
function allowedPresets(fw,region) {
  if(fw===1){if(region==='EU_866')return ['LITE_FAST','LITE_SLOW'];if(region==='EU_N_868')return ['NARROW_FAST','NARROW_SLOW'];if(region==='EU_868')return PRESETS.filter(p=>!p.endsWith('TURBO'));return PRESETS}
  return ['EU_868','EU_433','UA_433','PH_433'].includes(region)?PRESETS.filter(p=>!p.endsWith('TURBO')):PRESETS;
}
const row = (text,callback_data) => [{text,callback_data}];
const buttonRows = rows => ({inline_keyboard:rows});
const state = (ci,ids=[],fw=-1,region=0,preset=-1,power=0) => ({ci,ids,fw,region,preset,power});
const serialize = s => [s.ci,s.ids.join('.'),s.fw,s.region,s.preset,s.power].join(':');
const cb = (action,s) => {const value='m:'+action+':'+serialize(s);if(Buffer.byteLength(value)>MAX_CALLBACK)throw Error('Callback Telegram troppo lungo');return value};
function parse(raw) {
  const parts=raw.split(':');if(parts.length!==8||parts[0]!=='m')throw Error('Stato MULTI non valido');
  const [_,action,ci,ids,fw,region,preset,power]=parts;
  const s=state(Number(ci),ids?ids.split('.').map(Number):[],Number(fw),Number(region),Number(preset),Number(power));
  if(!Number.isSafeInteger(s.ci)||!catalog.communities[s.ci]||catalog.communities[s.ci].protocol!=='meshtastic'||s.ids.length>8||![s.fw,s.region,s.preset,s.power].every(Number.isSafeInteger)||s.ids.some(i=>!Number.isSafeInteger(i)||!catalog.channels[i]||!catalog.communities.some(c=>c.id===catalog.channels[i].community&&c.protocol==='meshtastic')))throw Error('Stato MULTI non valido');
  return {action,s};
}
function start(ci) { const s=state(ci);return screen(s,'communities') }
function screen(s,stage) {
  const community=catalog.communities[s.ci], chosen=s.ids.map((id,i)=>'CH'+i+' · '+catalog.communities.find(c=>c.id===catalog.channels[id].community).name+' / '+catalog.channels[id].name);
  const summary='QRMesh · MULTI Meshtastic\n'+(chosen.length?chosen.join('\n'):'Nessun canale selezionato');
  const rows=[];
  let text=summary;
  if(stage==='communities'){
    text+='\n\nScegli la community per CH'+s.ids.length+(s.ids.length===0?' (PRIMARY)':' (SECONDARY)')+':';
    catalog.communities.forEach((c,i)=>{if(c.protocol==='meshtastic'&&catalog.channels.some(ch=>ch.community===c.id))rows.push(row(c.name,cb('c'+i,s)))});
    if(s.ids.length)rows.push(row('✅ Termina selezione canali',cb('finish',s)));
    if(s.ids.length)rows.push(row('↩ Rimuovi ultimo canale',cb('undo',s)));
  } else if(stage==='choose'){
    text+='\n\nSeleziona CH'+s.ids.length+(s.ids.length===0?' (PRIMARY)':' (SECONDARY)')+' (massimo 8):';
    catalog.channels.forEach((c,i)=>{if(c.community===community.id)rows.push(row(c.name,cb('a'+i,s)))});
    if(s.ids.length)rows.push(row('✅ Termina selezione canali',cb('finish',s)));
    rows.push(row('↩ Cambia community',cb('back',s)));
  } else if(stage==='lora') {
    text+='\n\nVuoi includere la configurazione LoRa nel QR?';
    rows.push(row('📡 Sì, configura LoRa',cb('lora',s)),row('➡️ No, genera QR',cb('send',s)));
  } else if(stage==='firmware'){
    text+='\n\nSeleziona il firmware:';
    FW.forEach((name,i)=>rows.push(row(name,cb('f'+i,s))));
  } else if(stage==='region'){
    text+='\n\nFirmware: '+FW[s.fw]+'\nSeleziona la regione LoRa:';
    const regions=allowedRegions(s.fw);
    for(let i=0;i<regions.length;i+=3)rows.push(regions.slice(i,i+3).map(name=>({text:name,callback_data:cb('r'+REGION_IDS[name],s)})));
  } else if(stage==='preset'){
    const region=Object.keys(REGION_IDS).find(k=>REGION_IDS[k]===s.region);
    text+='\n\nRegione: '+region+'\nSeleziona il modem preset:';
    allowedPresets(s.fw,region).forEach(name=>rows.push(row(name,cb('p'+PRESET_IDS[name],s))));
  } else if(stage==='power'){
    text+='\n\nSeleziona la potenza TX (dBm). 0 = automatica. Verifica i limiti locali e hardware.';
    [0,5,10,14,20,27,30].forEach(n=>rows.push(row(n===0?'AUTO (0)':n+' dBm',cb('w'+n,s))));
  } else if(stage==='confirm'){
    const region=Object.keys(REGION_IDS).find(k=>REGION_IDS[k]===s.region);
    text+='\n\nLoRa: '+FW[s.fw]+' · '+region+' · '+Object.keys(PRESET_IDS).find(k=>PRESET_IDS[k]===s.preset)+' · TX '+(s.power||'AUTO')+' dBm';
    rows.push(row('✅ Genera QR multicanale',cb('send',s)));
    rows.push(row('✏️ Modifica configurazione LoRa',cb('lora',s)));
  }
  if(stage!=='choose'&&stage!=='communities')rows.push(row('↩ Modifica canali',cb('back',s)));
  return {text,reply_markup:buttonRows(rows)};
}
function createUrl(s){
  if(!s.ids.length||s.ids.length>8)throw Error('Seleziona da 1 a 8 canali');
  const parts=s.ids.map(i=>{
    const c=catalog.channels[i],name=Buffer.from(c.name,'utf8'),key=Buffer.from(c.key,'base64');
    if(name.length>11||!name.length||![1,16,32].includes(key.length))throw Error('Canale non valido: '+c.name);
    return bytes(1,Buffer.concat([bytes(2,key),bytes(3,name)]));
  });
  if(s.fw>=0){
    const region=Object.keys(REGION_IDS).find(k=>REGION_IDS[k]===s.region);
    if(!region||!allowedRegions(s.fw).includes(region)||!allowedPresets(s.fw,region).some(p=>PRESET_IDS[p]===s.preset)||!Number.isInteger(s.power)||s.power<0||s.power>30)throw Error('Parametri LoRa non validi');
    const lora=[integer(1,1),integer(2,s.preset),integer(7,s.region)];
    if(s.power)lora.push(integer(10,s.power));
    parts.push(bytes(2,Buffer.concat(lora)));
  }
  return BASE+Buffer.concat(parts).toString('base64url');
}
function next(raw){
  const {action,s}=parse(raw);
  if(action==='back')return screen(s,'communities');
  if(action==='undo'){s.ids.pop();return screen(s,'communities')}
  if(/^c\\d+$/.test(action)){const ci=Number(action.slice(1));if(!catalog.communities[ci]||catalog.communities[ci].protocol!=='meshtastic'||s.ids.length>=8)throw Error('Community non disponibile');s.ci=ci;return screen(s,'choose')}
  if(action.startsWith('a')&&/^a\d+$/.test(action)){
    const index=Number(action.slice(1));
    if(s.ids.length>=8||!catalog.channels[index]||catalog.channels[index].community!==catalog.communities[s.ci].id)throw Error('Canale non disponibile');
    s.ids.push(index);return screen(s,s.ids.length===8?'lora':'communities');
  }
  if(!s.ids.length)throw Error('Seleziona almeno un canale');
  if(action==='finish')return screen(s,'lora');
  if(action==='lora')return screen(s,'firmware');
  if(/^f[0-3]$/.test(action)){s.fw=Number(action.slice(1));s.region=0;s.preset=-1;s.power=0;return screen(s,'region')}
  if(/^r\d+$/.test(action)){
    const region=Number(action.slice(1));
    if(s.fw<0||!allowedRegions(s.fw).some(n=>REGION_IDS[n]===region))throw Error('Regione non supportata');
    s.region=region;s.preset=-1;return screen(s,'preset');
  }
  if(/^p\d+$/.test(action)){
    const preset=Number(action.slice(1)),region=Object.keys(REGION_IDS).find(k=>REGION_IDS[k]===s.region);
    if(!region||!allowedPresets(s.fw,region).some(n=>PRESET_IDS[n]===preset))throw Error('Preset non supportato');
    s.preset=preset;return screen(s,'power');
  }
  if(/^w\d+$/.test(action)){
    const power=Number(action.slice(1));
    if(![0,5,10,14,20,27,30].includes(power)||s.preset<0)throw Error('Potenza non valida');
    s.power=power;return screen(s,'confirm');
  }
  if(action==='send')return {url:createUrl(s),caption:'QRMesh MULTI · '+'Meshtastic'+'\n'+s.ids.map((i,n)=>'CH'+n+': '+catalog.communities.find(c=>c.id===catalog.channels[i].community).name+' / '+catalog.channels[i].name).join('\n')+'\nVerifica la configurazione nell’app Meshtastic prima dell’uso.'};
  throw Error('Comando non riconosciuto');
}
module.exports={start,next,createUrl,parse};
