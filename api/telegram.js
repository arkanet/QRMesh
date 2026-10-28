'use strict';
const QRCode = require('qrcode');
const catalog = require('../data/catalog.json');

const API = 'https://api.telegram.org';
const BASE_URL = 'https://allqrmesh.vercel.app/';
const PAGE_SIZE = 8;

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
function communityKeyboard() {
  return buttons(catalog.communities.map(c => [{ text: c.name, callback_data: 'c:' + c.id }]));
}
function channelKeyboard(id, page) {
  const entries = catalog.channels.map((c, index) => ({...c, index})).filter(c => c.community === id);
  const max = Math.max(0, Math.ceil(entries.length / PAGE_SIZE) - 1);
  page = Math.max(0, Math.min(page, max));
  const rows = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    .map(c => [{ text: c.name, callback_data: 'q:' + c.index }]);
  const nav = [];
  if (page > 0) nav.push({ text: '◀', callback_data: 'p:' + id + ':' + (page - 1) });
  if (page < max) nav.push({ text: '▶', callback_data: 'p:' + id + ':' + (page + 1) });
  if (nav.length) rows.push(nav);
  rows.push([{ text: '🌐 Risorse community', callback_data: 's:' + id }]);
  rows.push([{ text: '◀ Community', callback_data: 'home' }]);
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
async function handle(update, token) {
  const cb = update.callback_query;
  const msg = update.message;
  const chat = cb?.message?.chat?.id ?? msg?.chat?.id;
  if (!chat) return;
  if (cb) await telegram('answerCallbackQuery', { callback_query_id: cb.id }, token);
  const data = cb?.data || '';
  const command = (msg?.text || '').trim().split(/\s+/)[0].split('@')[0].toLowerCase();
  if (data === 'home' || ['/start', '/help', '/community', '/channels', '/qr', '/link'].includes(command)) {
    await send(chat, 'QRMesh — scegli una community per ottenere canali, QR e link.\n' + BASE_URL, token, communityKeyboard()); return;
  }
  if (data.startsWith('c:') || data.startsWith('p:')) {
    const parts = data.split(':');
    const id = parts[1];
    const c = catalog.communities.find(x => x.id === id);
    if (!c) return;
    await send(chat, 'Canali di ' + c.name + ' — seleziona un canale:', token, channelKeyboard(id, Number(parts[2] || 0))); return;
  }
  if (data.startsWith('s:') || command === '/social') {
    const id = data.startsWith('s:') ? data.slice(2) : null;
    if (!id) { await send(chat, 'Seleziona la community:', token, communityKeyboard()); return; }
    const c = catalog.communities.find(x => x.id === id);
    if (!c) return;
    await send(chat, c.name + '\n' + c.resources.map(r => r.title + ': ' + r.url).join('\n'), token);
    for (const resource of c.resources) await photo(chat, c.name + ' · ' + resource.title + '\n' + resource.url, resource.url, token);
    return;
  }
  if (data.startsWith('q:')) {
    const index = Number(data.slice(2));
    if (!Number.isSafeInteger(index) || index < 0 || index >= catalog.channels.length) return;
    const channel = catalog.channels[index];
    const c = catalog.communities.find(x => x.id === channel.community);
    const url = importUrl(c, channel);
    await photo(chat, c.name + ' · ' + channel.name + '\n' + url + '\nVerifica preset, regione e frequenza radio.', url, token);
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
