'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../data/catalog.json');
const multi = require('../api/multi');
const ci = catalog.communities.findIndex(c=>c.protocol==='meshtastic' && catalog.channels.some(ch=>ch.community===c.id));
test('wizard generates QR for a Meshtastic community',()=>{
  assert.ok(ci>=0);
  const start=multi.start(ci);
  assert.match(start.text,/CH0/);
  const community=start.reply_markup.inline_keyboard.flat().find(b=>b.callback_data.startsWith('m:c'+ci+':'));\n  const choice=multi.next(community.callback_data).reply_markup.inline_keyboard.flat().find(b=>b.callback_data.startsWith('m:a'));
  assert.ok(choice);
  const next=multi.next(choice.callback_data);
  assert.match(next.text,/CH0/);
  const finish=next.reply_markup.inline_keyboard.flat().find(b=>b.callback_data.includes(':finish:'));
  const lora=multi.next(finish.callback_data);
  const skip=lora.reply_markup.inline_keyboard.flat().find(b=>b.callback_data.includes(':send:'));
  const result=multi.next(skip.callback_data);
  assert.match(result.url,/^https:\/\/meshtastic.org\/e\/#/);
  assert.ok(Buffer.from(result.url.split('#')[1],'base64url').length>0);
});
test('wizard configures LoRa and includes it in ChannelSet',()=>{
  const community=multi.start(ci).reply_markup.inline_keyboard.flat().find(b=>b.callback_data.startsWith('m:c'+ci+':'));\n  const choice=multi.next(community.callback_data).reply_markup.inline_keyboard.flat().find(b=>b.callback_data.startsWith('m:a'));
  const selected=multi.next(choice.callback_data);
  const finish=selected.reply_markup.inline_keyboard.flat().find(b=>b.callback_data.includes(':finish:'));
  let screen=multi.next(finish.callback_data);
  for(const action of ['lora','f0','r3','p4','w0']){
    const b=screen.reply_markup.inline_keyboard.flat().find(x=>x.callback_data.startsWith('m:'+action+':'));
    assert.ok(b,'missing '+action);
    screen=multi.next(b.callback_data);
  }
  const send=screen.reply_markup.inline_keyboard.flat().find(b=>b.callback_data.includes(':send:'));
  const result=multi.next(send.callback_data);
  assert.match(result.caption,/LoRa|Verifica/);
  assert.ok(Buffer.from(result.url.split('#')[1],'base64url').length>10);
});
test('all callback payloads stay within Telegram 64-byte limit',()=>{
  const s=multi.start(ci);
  for(const b of s.reply_markup.inline_keyboard.flat())assert.ok(Buffer.byteLength(b.callback_data)<=64);
});

test('each channel can come from a different Meshtastic community',()=>{
  const communities=catalog.communities.map((c,i)=>({c,i})).filter(x=>x.c.protocol==='meshtastic'&&catalog.channels.some(ch=>ch.community===x.c.id));
  assert.ok(communities.length>=2);
  let page=multi.start(communities[0].i);
  const choose=(action)=>{const b=page.reply_markup.inline_keyboard.flat().find(x=>x.callback_data.startsWith('m:'+action+':'));assert.ok(b,'missing '+action);page=multi.next(b.callback_data)};
  choose('c'+communities[0].i);
  const first=page.reply_markup.inline_keyboard.flat().find(x=>x.callback_data.startsWith('m:a'));
  assert.ok(first);
  page=multi.next(first.callback_data);
  assert.match(page.text,/CH1/);
  choose('c'+communities[1].i);
  const second=page.reply_markup.inline_keyboard.flat().find(x=>x.callback_data.startsWith('m:a'));
  assert.ok(second);
  page=multi.next(second.callback_data);
  assert.match(page.text,/CH0/);
  assert.match(page.text,/CH1/);
  choose('finish');
  choose('send');
  assert.ok(page.url);
});
