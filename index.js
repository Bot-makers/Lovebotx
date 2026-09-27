const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const OWNER_NUMBER="2348113825090";
const PAIR_NUMBER="2348113825090";
const USE_PAIR_CODE=true;
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
 if(USE_PAIR_CODE &&!state.creds.registered){
   setTimeout(async()=>{
     try{
       let code = await sock.requestPairingCode(PAIR_NUMBER);
       console.log(`\n\n🔑 PAIR CODE FOR ${PAIR_NUMBER}: ${code}\n\n`);
     }catch(e){ console.log(e.message); }
   }, 5000);
 }
 sock.ev.on('messages.upsert', async ({messages})=>{
  for(let m of messages){
   if(!m.message || m.key.fromMe) continue;
   let from=m.key.remoteJid;
   let text=(m.message.conversation||m.message.extendedTextMessage?.text||"").trim();
   let senderNum=from.split('@')[0];
   try{
     let vm=m.message.viewOnceMessage||m.message.viewOnceMessageV2;
     let inner=vm?.message;
     if(inner && antiViewOnce){
       let type=Object.keys(inner)[0];
       let mediaMsg={...m, message: inner };
       let buffer=await downloadMediaMessage(mediaMsg, 'buffer', {}, { logger: pino({level:'silent'}), reuploadRequest: sock.updateMediaMessage });
       if(type==='imageMessage') await sock.sendMessage(from,{image:buffer,caption:`🔓 VIEW ONCE OPENED`},{quoted:m});
       if(type==='videoMessage') await sock.sendMessage(from,{video:buffer,caption:`🔓 VIEW ONCE OPENED`},{quoted:m});
       console.log("ViewOnce opened");
     }
   }catch{}
   if(text===".menu") await sock.sendMessage(from,{text:"LOVE-BOT V6 ONLINE ✅\n.ping\n.vv"});
   if(text===".ping") await sock.sendMessage(from,{text:"PONG 🏓 ONLINE"});
   if(text===".vv") await sock.sendMessage(from,{text:`Anti-VV: ${antiViewOnce?'ON':'OFF'}`});
  }
 });
 sock.ev.on('connection.update', u=>{
   if(u.connection==='open') console.log("\n✅ BOT CONNECTED\n");
   if(u.connection==='close') setTimeout(start,3000);
 });
}
start();
