const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 8000;
const MAX_USERS = 9;

if(!fs.existsSync('./sessions')) fs.mkdirSync('./sessions');

app.get('/', (req,res)=>{
  let c=fs.readdirSync('./sessions').length;
  res.send(`<h1>LOVE-BOT - ${c}/${MAX_USERS}</h1><form action="/pair" method="get"><input name="number" placeholder="2348113825090" style="padding:10px;width:200px"><button style="padding:10px">Get Code</button></form><p>Or use /pair?number=234...</p>`);
});

app.get('/pair', async (req,res)=>{
  let num=(req.query.number||'').replace(/[^0-9]/g,'');
  if(!num || num.length < 10) return res.send('Enter full number e.g. 2348113825090 <a href="/">Back</a>');
  let active=fs.readdirSync('./sessions').length;
  if(active>=MAX_USERS && !fs.existsSync(`./sessions/${num}`)) return res.send(`FULL! ${MAX_USERS}/${MAX_USERS} paired`);

  try {
    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${num}`);
    const sock=makeWASocket({auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,pino({level:'fatal'}))},browser:["LOVE-BOT","Chrome","1.0"],logger:pino({level:'silent'})});
    sock.ev.on('creds.update', saveCreds);

    if(state.creds.registered){
      startBot(num);
      return res.send(`<h2>${num} already paired ✅</h2><a href="/">Back</a>`);
    }

    let code = await sock.requestPairingCode(num);
    console.log(`CODE FOR ${num}: ${code}`);
    
    res.send(`
      <h1>Pair Code for ${num}</h1>
      <h1 style="font-size:50px;letter-spacing:5px;background:#000;color:#0f0;padding:20px;border-radius:10px">${code}</h1>
      <p>1. Open WhatsApp</p><p>2. Linked Devices</p><p>3. Link with phone number</p><p>4. Enter this code</p>
      <p>Code expires in 60 seconds, refresh if expired</p>
      <a href="/">Back</a>
    `);
    setTimeout(()=>startBot(num),2000);

  } catch(e){ res.send(`Error: ${e.message} <a href="/">Try again</a>`); }
});

async function startBot(num){
  const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${num}`);
  const sock=makeWASocket({auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,pino({level:'fatal'}))},browser:["LOVE-BOT","Chrome","1.0"],logger:pino({level:'silent'})});
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.upsert', async ({messages})=>{
    for(let m of messages){ if(!m.message||m.key.fromMe) continue; let t=(m.message.conversation||m.message.extendedTextMessage?.text||"").trim(); if(t===".ping") await sock.sendMessage(m.key.remoteJid,{text:`Pong ${num}`}); if(t===".menu") await sock.sendMessage(m.key.remoteJid,{text:`Menu ${num}\n.ping`}); }
  });
  sock.ev.on('connection.update', u=>{ if(u.connection==='close') setTimeout(()=>startBot(num),3000); });
}

fs.readdirSync('./sessions').forEach(n=>startBot(n));
app.listen(PORT, ()=>console.log(`Running on ${PORT}`));
