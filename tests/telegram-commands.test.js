'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync(require('node:path').join(__dirname,'../api/telegram.js'),'utf8');
test('Telegram command registration and help are implemented',()=>{
 for(const name of ['start','help','community','channels','qr','link','multi','back','restart','social'])
  assert.match(src,new RegExp('"'+name+'"'));
 assert.match(src,/setMyCommands/);
 assert.match(src,/HELP_TEXT/);
 assert.match(src,/callback_data:'help'/);
});
test('link and QR callbacks are separate',()=>{
 assert.match(src,/data\.startsWith\('l:'\)/);
 assert.match(src,/data\.startsWith\('q:'\)/);
 assert.match(src,/linkpick:/);
});

test('main bot menu presents protocol choices before communities',()=>{
 assert.match(src,/function homeKeyboard\(\)/);
 assert.match(src,/callback_data:'protocol:meshtastic'/);
 assert.match(src,/callback_data:'protocol:meshcore'/);
 assert.match(src,/callback_data:'protocol-single:meshtastic'/);
 assert.match(src,/callback_data:'protocol-multi:meshtastic'/);
});
