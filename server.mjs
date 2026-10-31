import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {newSession,turn} from './lib/conversation.mjs';
import {tick} from './lib/printer.mjs';

const sessions=new Map(),root=new URL('./public/',import.meta.url);
const assets=new Map([['/',['index.html','text/html']],['/index.html',['index.html','text/html']],['/app.js',['app.js','text/javascript']],['/style.css',['style.css','text/css']],['/voice.html',['voice.html','text/html']]]);
const secretEqual=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y);};
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
function sessionFor(req,res) {
  const now=Date.now();for(const [key,s] of sessions)if(now-s.touched>2*60*60*1000)sessions.delete(key);
  let id=req.headers.cookie?.match(/(?:^|;\s*)pip_session=([a-f0-9]{48})(?:;|$)/)?.[1];
  if(!id||!sessions.has(id)){
    if(sessions.size>=100) sessions.delete(sessions.keys().next().value);
    id=randomBytes(24).toString('hex');sessions.set(id,{...newSession(),csrf:randomBytes(24).toString('hex'),unlocked:!process.env.APP_PASSWORD});
    res.setHeader('Set-Cookie',`pip_session=${id}; HttpOnly; SameSite=Lax; Path=/`);
  }
  const s=sessions.get(id);s.touched=now;return s;
}
async function body(req) {
  if(!req.headers['content-type']?.startsWith('application/json'))throw new Error('json');
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>3_000_000)throw new Error('size');chunks.push(chunk);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export async function handler(req,res) {
  const path=new URL(req.url,'http://localhost').pathname;
  // Only public assets are served. .env, server source and provider modules
  // have no static route and cannot be downloaded through a guessed path.
  if(req.method==='GET'&&assets.has(path)) {
    const [filename,type]=assets.get(path);
    try{const bytes=await readFile(new URL(filename,root));res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(bytes);}catch{res.writeHead(404);res.end('Not found');}return;
  }
  if(!path.startsWith('/api/')){res.writeHead(404);res.end('Not found');return;}
  const s=sessionFor(req,res);
  if(req.method==='GET'&&path==='/api/state') {
    json(res,200,{csrf:s.csrf,locked:!s.unlocked,google:!!process.env.GEMINI_API_KEY?.trim(),elevenlabs:!!process.env.ELEVENLABS_API_KEY?.trim(),printer:tick(s.printer)});return;
  }
  if(req.method!=='POST'||!secretEqual(req.headers['x-pip-csrf'],s.csrf)){json(res,403,{error:'Reload the page before submitting a request.'});return;}
  let input;try{input=await body(req);}catch{json(res,400,{error:'Invalid or oversized request.'});return;}
  if(path==='/api/unlock') {
    if(Date.now()-(s.lastUnlock||0)<2000){json(res,429,{error:'Wait before trying again.'});return;}
    s.lastUnlock=Date.now();s.unlocked=!process.env.APP_PASSWORD||secretEqual(String(input.password||''),process.env.APP_PASSWORD);
    json(res,s.unlocked?200:403,{ok:s.unlocked,error:s.unlocked?undefined:'Incorrect app password.'});return;
  }
  if(!s.unlocked){json(res,403,{error:'Unlock the app first.'});return;}
  if(path==='/api/reset') {
    if(s.busy){json(res,409,{error:'Wait for the current turn before resetting.'});return;}
    Object.assign(s,newSession());json(res,200,{printer:s.printer});return;
  }
  if(path==='/api/turn') {
    if(Date.now()-s.lastTurn<1500){json(res,429,{error:'Wait a moment before the next turn.'});return;}
    if(input.source!==s.source){s.pending=null;s.history=[];s.source=input.source;}
    s.lastTurn=Date.now();
    try{json(res,200,await turn(s,input));}catch{json(res,409,{error:'Turn already processed or Pip is busy. Try a new question.'});}return;
  }
  json(res,404,{error:'Endpoint not found.'});
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const server=http.createServer((req,res)=>{handler(req,res).catch(()=>{if(!res.headersSent)json(res,500,{error:'Request failed.'});else res.end();});});
  server.listen(Number(process.env.PORT)||3000,process.env.HOST||'0.0.0.0',()=>console.log('Pip is ready. Open the app preview or http://localhost:'+(process.env.PORT||3000)));
}
