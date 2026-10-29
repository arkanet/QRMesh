'use strict';
const QRCode = require('qrcode');
const catalog = require('../data/catalog.json');
const multi = require('./multi');

const API = 'https://api.telegram.org';
const BASE_URL = 'https://allqrmesh.vercel.app/';
const MULTI_URL = BASE_URL + 'multicanale.html';
const PAGE_SIZE = 8;
const BOT_COMMANDS = [{"command":"start","description":"Apri il menu principale"},{"command":"help","description":"Guida e istruzioni"},{"command":"community","description":"Scegli una community"},{"command":"channels","description":"Esplora i canali"},{"command":"qr","description":"Genera QR"},{"command":"link","description":"Ottieni link di importazione"},{"command":"multi","description":"QR multicanale Meshtastic"},{"command":"back","description":"Torna alle community"},{"command":"restart","description":"Ricomincia"},{"command":"social","description":"Risorse delle community"}];
const HELP_TEXT = "📖 QRMesh · Comandi disponibili\n\n/start — Apri il menu principale\n/help — Guida e istruzioni\n/community — Scegli una community\n/channels — Esplora i canali\n/qr — Genera QR\n/link — Ottieni link di importazione\n/multi — QR multicanale Meshtastic\n/back — Torna alle community\n/restart — Ricomincia\n/social — Risorse delle community\n\nMULTI: seleziona fino a 8 canali, anche da community differenti, con LoRa opzionale. Per tornare indietro dentro MULTI usa i pulsanti ↩.";

function encodeVarint(n) {
  const out = [];
  while (n > 127) { out.push((n & 127) | 128); n = Math.floor(n / 128); }
  out.push(n); return out;
}
function field(n, data) { return Buffer.from([...encodeVarint(n * 8 + 2), ...encodeVarint(data.length), ...data]); }
function importUrl(community, channel) {
  if (community.protocol === 'meshcore') {
    return 'meshcore://channel/add?name=' + encodeURIComponent(channel.name) + '&secret=' + channel.key.toLowerCase();
  }
  const psk = Buffer.from(channel.key, 'base64');
  const settings = Buffer.concat([field(2, psk), field(3, Buffer.from(channel.name, 'utf8'))]);
  return 'https://meshtastic.org/e/#' + field(1, settings).toString('base64url');
}
function buttons(rows) { return { inline_keyboard: rows }; }
function row(text,callback_data){return [{text,callback_data}]}
function helpKeyboard(){return buttons([[{text:'🏠 Menu',callback_data:'home'}],[{text:'📡 Community',callback_data:'communities'}],[{text:'🧩 MULTI',callback_data:'multi-home'}]]);}
function communityKeyboard() {
  return buttons([...catalog.communities.map(c => [{ text: c.name, callback_data: 'c:' + c.id }]), [{text:'🧩 MULTI Meshtastic',callback_data:'multi-home'}], [{text:'📖 Comandi',callback_data:'help'}]]);
}
function modeKeyboard(id) { const c=catalog.communities.find(x=>x.id===id);if(!c)return communityKeyboard();if(c.protocol!=='meshtastic')return channelKeyboard(id,0);const ci=catalog.communities.indexOf(c);return buttons([[{text:'🔹 SINGOLO',callback_data:'single:'+id},{text:'🧩 MULTI',callback_data:'multi:'+ci}],[{text:'◀ Community',callback_data:'home'}]]); }
function channelKeyboard(id, page, output='qr') {
  const entries = catalog.channels.map((c, index) => ({...c, index})).filter(c => c.community === id);
  const max = Math.max(0, Math.ceil(entries.length / PAGE_SIZE) - 1);
  page = Math.max(0, Math.min(page, max));
  const rows = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    .map(c => [{ text: c.name, callback_data: (output==='link'?'l:':'q:') + c.index }]);
  const nav = [];
  if (page > 0) nav.push({ text: '◀', callback_data: 'p:' + id + ':' + (page - 1) + ':' + output });
  if (page < max) nav.push({ text: '▶', callback_data: 'p:' + id + ':' + (page + 1) + ':' + output });
  if (nav.length) rows.push(nav);
  rows.push([{ text: '🌐 Risorse community', callback_data: 's:' + id }]);
  if (catalog.communities.find(c => c.id === id)?.protocol === 'meshtastic') rows.push([{ text: '🧩 Configura QR MULTI · Meshtastic Only', url: MULTI_URL }]);
  rows.push([{ text: '◀ Community', callback_data: 'communities' }]);
  rows.push([{text:'📖 Comandi',callback_data:'help'}]);
  return buttons(rows);
}
async function telegram(method, data, token) {
  const response = await fetch(API + '/bot' + token + '/' + method, { method: 'POST', body: JSON.stringify(data), headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error('Telegram ' + method + ': HTTP ' + response.status);
  return response.json();
}
async function photo(chat_id, caption, url, token) {
  const buffer = await QRCode.toBuffer(url, { width: 512, margin: 2, errorCorrectionLevel: 'M' });
  const body = new FormData();
  body.append('chat_id', String(chat_id));
  body.append('caption', caption);
  body.append('photo', new Blob([buffer], { type: 'image/png' }), 'qrmesh.png');
  const response = await fetch(API + '/bot' + token + '/sendPhoto', { method: 'POST', body, signal: AbortSignal.timeout(9000) });
  if (!response.ok) throw new Error('Telegram sendPhoto: HTTP ' + response.status);
}
async function send(chat_id, text, token, reply_markup) {
  await telegram('sendMessage', { chat_id, text, ...(reply_markup ? { reply_markup } : {}), disable_web_page_preview: true }, token);
}
async function registerCommands(token){await telegram('setMyCommands',{commands:BOT_COMMANDS,language_code:'it'},token);}
async function handle(update, token) {
  const cb = update.callback_query;
  const msg = update.message;
  const chat = cb?.message?.chat?.id ?? msg?.chat?.id;
  if (!chat) return;
  if (cb) await telegram('answerCallbackQuery', { callback_query_id: cb.id }, token);
  const data = cb?.data || '';
  const command = (msg?.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  if(command==='/start'||command==='/restart'||data==='home'){
    if(command==='/start'||command==='/restart')try{await registerCommands(token)}catch(e){console.error('setMyCommands:',e.message)}
    await send(chat,'QRMesh — scegli una community per ottenere canali, QR e link.\n'+BASE_URL,token,communityKeyboard());return;
  }
  if(command==='/help'||data==='help'){await send(chat,HELP_TEXT,token,helpKeyboard());return;}
  if(command==='/back'||data==='communities'){await send(chat,'↩ Scegli una community:',token,communityKeyboard());return;}
  if(command==='/multi'||data==='multi-home'){
    await send(chat,'Scegli una community Meshtastic per il QR MULTI:',token,buttons(catalog.communities.map((c,i)=>({c,i})).filter(x=>x.c.protocol==='meshtastic').map(x=>row(x.c.name,'multi:'+x.i)).concat([[{text:'📖 Comandi',callback_data:'help'}]])));return;
  }
  if(['/community','/channels','/qr','/link','/social'].includes(command)){
    const action=command.slice(1);
    const prefix=action==='social'?'s':action==='qr'?'qrpick':action==='link'?'linkpick':action==='channels'?'p':'c';
    await send(chat,'Scegli una community per '+action+':',token,buttons(catalog.communities.map(c=>row(c.name,prefix+':'+c.id)).concat([[{text:'📖 Comandi',callback_data:'help'}]])));return;
  }
  if(data.startsWith('qrpick:')||data.startsWith('linkpick:')){
    const [purpose,id]=data.split(':');const c=catalog.communities.find(x=>x.id===id);if(!c)return;
    await send(chat,'Seleziona un canale di '+c.name+':',token,channelKeyboard(id,0,purpose==='linkpick'?'link':'qr'));return;
  }
  if (data.startsWith('multi:')) { const ci=Number(data.slice(6));if(!Number.isSafeInteger(ci)||!catalog.communities[ci]||catalog.communities[ci].protocol!=='meshtastic')return;const result=multi.start(ci);await send(chat,result.text,token,result.reply_markup);return; }
  if (data.startsWith('m:')) { try {const result=multi.next(data);if(result.url)await photo(chat,result.caption+'\n'+result.url,result.url,token);else await send(chat,result.text,token,result.reply_markup);}catch(error){await send(chat,'Configurazione non valida: '+error.message+'\nRiparti dalla community con /start.',token);}return; }
  if (data.startsWith('single:')) { const id=data.slice(7);const c=catalog.communities.find(x=>x.id===id);if(c)await send(chat,'Canali di '+c.name+' — seleziona un canale:',token,channelKeyboard(id,0));return; }
  if (data.startsWith('c:') || data.startsWith('p:')) {
    const parts = data.split(':');
    const id = parts[1];
    const c = catalog.communities.find(x => x.id === id);
    if (!c) return;
    await send(chat, c.protocol==='meshtastic'&&data.startsWith('c:')?'Come vuoi configurare i canali di '+c.name+'?':'Canali di '+c.name+' — seleziona un canale:', token, c.protocol==='meshtastic'&&data.startsWith('c:')?modeKeyboard(id):channelKeyboard(id, Number(parts[2] || 0), parts[3]==='link'?'link':'qr')); return;
  }
  if (data.startsWith('s:')) {
    const id = data.startsWith('s:') ? data.slice(2) : null;
    if (!id) { await send(chat, 'Seleziona la community:', token, communityKeyboard()); return; }
    const c = catalog.communities.find(x => x.id === id);
    if (!c) return;
    await send(chat, c.name + '\n' + c.resources.map(r => r.title + ': ' + r.url).join('\n'), token);
    for (const resource of c.resources) await photo(chat, c.name + ' · ' + resource.title + '\n' + resource.url, resource.url, token);
    return;
  }
  if (data.startsWith('q:') || data.startsWith('l:')) {
    const index = Number(data.slice(2));
    if (!Number.isSafeInteger(index) || index < 0 || index >= catalog.channels.length) return;
    const channel = catalog.channels[index];
    const c = catalog.communities.find(x => x.id === channel.community);
    const url = importUrl(c, channel);
    if (c.protocol === 'meshcore') {
      await photo(chat, c.name + ' · ' + channel.name + '\nVerifica preset, regione e frequenza radio.', url, token);
      await send(chat, url, token);
      await send(chat, channel.name, token);
      await send(chat, channel.key.toLowerCase(), token);
    } else if(data.startsWith('l:')) await send(chat,'🔗 '+c.name+' · '+channel.name+'\n'+url+'\nVerifica preset, regione e frequenza radio.',token,buttons([[{text:'📷 Mostra QR',callback_data:'q:'+index}],[{text:'📖 Comandi',callback_data:'help'}]]));
    else await photo(chat, c.name + ' · ' + channel.name + '\n' + url + '\nVerifica preset, regione e frequenza radio.', url, token);
    return;
  }
  if (command === '/start' || command === '/help') return;
}
module.exports = async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ service: 'QRMesh Telegram bot', configured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET) });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) return res.status(503).json({ error: 'Bot not configured' });
  if (req.headers['x-telegram-bot-api-secret-token'] !== secret) return res.status(403).json({ error: 'Forbidden' });
  const update = req.body;
  if (!update || typeof update !== 'object') return res.status(400).json({ error: 'Invalid update' });
  try { await handle(update, token); return res.status(200).json({ ok: true }); }
  catch (error) { console.error('Telegram webhook failure:', error.message); return res.status(500).json({ error: 'Webhook processing failed' }); }
};
