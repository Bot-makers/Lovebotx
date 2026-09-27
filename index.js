const fs=require('fs');
const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');

const PREFIX=".";
const OWNER_NUMBER="2348113825090";
const PAIR_NUMBER="2348113825090"; // Your number
const USE_PAIR_CODE=true;

let publicMode=true;
let antiViewOnce=true;

console.log("Starting LOVE-BOT V6...");

async function start(){
 const { state, saveCreds } = await useMultiFileAuthState('session');
 const sock = makeWASocket({
   auth: {creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'fatal'}))},
   browser: ["LOVE-BOT","Chrome","1.0"],
   logger: pino({level:'silent'})
 });
 sock.ev.on('creds.update', saveCreds);

 if(USE_PAIR_CODE && !state.creds.registered){
   setTimeout(async()=>{
     try{
       console.log(`Requesting pair code for ${PAIR_NUMBER}...`);
       let code = await sock.requestPairingCode(PAIR_NUMBER);
       console.log(`\n\n========================\n🔑 PAIR CODE: ${code}\nFOR: ${PAIR_NUMBER}\nGo to WhatsApp > Linked Devices > Link with phone number\n========================\n\n`);
     }catch(e){ console.log("Pair error:", e.message); }
   }, 5000);
 }

 sock.ev.on('messages.upsert', async ({messages})=>{
  for(let m of messages){
   if(!m.message || m.key.fromMe) continue;
   let from=m.key.remoteJid;
   let text=(m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||m.message.videoMessage?.caption||"").trim();
   let low=text.toLowerCase();
   let senderNum=(from.split('@')[0]||'').replace(/[^0-9]/g,'');
   let isOwner=senderNum.includes(OWNER_NUMBER);
   let pushName=m.pushName||"User";

   // === VIEW ONCE OPENER ===
   try{
     let viewOnceMsg=m.message.viewOnceMessage || m.message.viewOnceMessageV2 || m.message.viewOnceMessageV2Extension;
     let innerMsg=viewOnceMsg?.message;
     if(innerMsg && antiViewOnce){
       let type=Object.keys(innerMsg)[0];
       let mediaMsg={...m, message: innerMsg };
       let buffer=await downloadMediaMessage(mediaMsg, 'buffer', {}, { logger: pino({level:'silent'}), reuploadRequest: sock.updateMediaMessage });
       let caption=`🔓 *VIEW ONCE OPENED*\n👤 ${pushName} | ${senderNum}`;
       if(type==='imageMessage'){
         await sock.sendMessage(from, { image: buffer, caption }, { quoted: m });
       }else if(type==='videoMessage'){
         await sock.sendMessage(from, { video: buffer, caption }, { quoted: m });
       }else if(type==='audioMessage'){
         await sock.sendMessage(from, { audio: buffer, mimetype:'audio/mp4', ptt:true }, { quoted: m });
       }
       console.log(`ViewOnce opened from ${senderNum}`);
     }
   }catch(e){}

   if(low===`${PREFIX}menu`){
     await sock.sendMessage(from,{text:`*LOVE-BOT V6 ONLINE ✅*\n\n${PREFIX}ping\n${PREFIX}vv\n${PREFIX}antivv on/off\n${PREFIX}public\n${PREFIX}private\n${PREFIX}pair 234...`});
   }
   if(low===`${PREFIX}ping`){
     await sock.sendMessage(from,{text:`PONG 🏓\nVV: ${antiViewOnce?'ON 👁️':'OFF'}`});
   }
   if(low===`${PREFIX}vv`){
     await sock.sendMessage(from,{text:`Anti-ViewOnce: ${antiViewOnce?'✅ ON':'❌ OFF'}`});
   }
   if(low===`${PREFIX}antivv on` && isOwner){
     antiViewOnce=true; await sock.sendMessage(from,{text:"✅ Anti-VV ON"});
   }
   if(low===`${PREFIX}antivv off` && isOwner){
     antiViewOnce=false; await sock.sendMessage(from,{text:"❌ Anti-VV OFF"});
   }
   if(low===`${PREFIX}public` && isOwner){
     publicMode=true; await sock.sendMessage(from,{text:"PUBLIC 🌍"});
   }
   if(low===`${PREFIX}private` && isOwner){
     publicMode=false; await sock.sendMessage(from,{text:"PRIVATE 🔒"});
   }
  }
 });

 sock.ev.on('connection.update', u=>{
   if(u.connection==='open') console.log("\n✅ BOT + VIEW ONCE Connected - ONLINE\n");
   if(u.connection==='close') { console.log("Reconnecting..."); setTimeout(start,3000); }
 });
}
start();
