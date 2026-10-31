import test from 'node:test';import assert from 'node:assert/strict';
import {newPrinter,tick,parseAction,choice,propose,execute,quickReply} from '../lib/printer.mjs';
import {newSession,turn} from '../lib/conversation.mjs';
import {api} from '../lib/providers.mjs';

test('pause proposal does nothing until matching confirmation',()=>{
 const p=newPrinter(0),a=propose(p,parseAction('Pause my print.'),0);assert.equal(p.state,'printing');
 assert.throws(()=>execute(p,a,'wrong',100));execute(p,a,a.token,100);assert.equal(p.state,'paused');
 assert.throws(()=>execute(p,a,a.token,200));
});
test('resume, cancellation and heater targets',()=>{
 const p=newPrinter(0);p.state='paused';let a=propose(p,parseAction('resume the print'),0);execute(p,a,a.token,100);assert.equal(p.state,'printing');
 a=propose(p,parseAction('stop the print'),100);assert.match(a.description,/cannot be resumed/);execute(p,a,a.token,200);assert.equal(p.state,'cancelled');assert.equal(p.bed_target,0);assert.throws(()=>propose(p,{action:'resume'},300));
});
test('homing blocked in active and paused prints, works after cancellation',()=>{
 const p=newPrinter(0),action=parseAction('home all axes');assert.throws(()=>propose(p,action,0));p.state='paused';assert.throws(()=>propose(p,action,0));p.state='cancelled';const a=propose(p,action,0);execute(p,a,a.token,100);assert.equal(p.homed_axes,'xyz');
});
test('temperature limits and gradual simulated temperatures',()=>{
 const p=newPrinter(0),a=propose(p,parseAction('set nozzle to 220'),0);assert.equal(p.nozzle_target,205);execute(p,a,a.token,100);tick(p,1100);assert.equal(p.nozzle_target,220);assert.equal(p.nozzle,207);
 for(const q of ['set nozzle to 300','set bed to 111','set bed to 60.5'])assert.throws(()=>parseAction(q));
});
test('fan bounded and token cannot be reused',()=>{
 const p=newPrinter(0),a=propose(p,parseAction('set fan to 50 percent'),0);execute(p,a,a.token,100);assert.equal(p.fan,50);assert.throws(()=>execute(p,a,a.token,200));assert.throws(()=>parseAction('set fan to 101 percent'));
});
test('confirmation expiration, changed job and changed state',()=>{
 const p=newPrinter(0),a=propose(p,{action:'pause'},0);assert.throws(()=>execute(p,a,a.token,61000));p.job='new';assert.throws(()=>execute(p,a,a.token,100));p.job=a.job;p.state='complete';assert.throws(()=>execute(p,a,a.token,100));
});
test('negation and compound commands never become actions',()=>{
 for(const q of ['do not pause my print','pause and resume','home x and cancel','set bed to 60 and resume'])assert.equal(parseAction(q),null);
 assert.equal(choice('yes'),null);assert.equal(choice('confirm and pause'),null);assert.equal(choice('yes, confirm.'),true);assert.equal(choice('cancel'),false);
});
test('quick status facts and unknown values',()=>{
 const p=newPrinter(0);assert.match(quickReply('How is my print doing?',p),/36%/);assert.match(quickReply('nozzle temperature',p),/205/);assert.equal(quickReply('pause my print',p),null);assert.match(quickReply('bed temperature',{...p,bed:null}),/not reported/);
});
test('duplicate turn IDs are rejected without provider calls',async()=>{
 const s=newSession();const input={id:'one',text:'status',source:'demo'};await turn(s,input);await assert.rejects(()=>turn(s,input),/already processed/);
});
test('spoken confirm executes exactly the pending proposal',async()=>{
 const s=newSession(),io={speak:async()=>Buffer.from('audio')};
 let r=await turn(s,{id:'a',text:'pause my print',source:'demo',consent:true,voice:true},io);
 assert.equal(s.printer.state,'printing');assert.ok(r.confirmation_token);
 r=await turn(s,{id:'b',text:'confirm',source:'demo',confirmation_token:r.confirmation_token},io);assert.equal(s.printer.state,'paused');assert.equal(r.confirmation_token,'');
});
test('home mode never executes an action',async()=>{
 const s=newSession(),io={moonraker:async()=>({...newPrinter(),state:'printing'})};
 const r=await turn(s,{id:'a',text:'pause my print',source:'home'},io);assert.match(r.reply,/read only/);assert.equal(s.pending,null);assert.equal(s.printer.state,'printing');
});
test('unclear confirmation and timeout dismiss the request',async()=>{
 const s=newSession();let r=await turn(s,{id:'a',text:'pause my print'});r=await turn(s,{id:'b',text:'maybe',confirmation_token:r.confirmation_token});assert.equal(s.printer.state,'printing');assert.equal(s.pending,null);
 await turn(s,{id:'c',text:'pause my print'});await turn(s,{id:'d',kind:'confirmation_timeout'});assert.equal(s.pending,null);
});
test('provider failures do not expose credentials or arbitrary bodies',async()=>{
 const old=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({detail:{code:'invalid_api_key',message:'PRIVATE SECRET'}}),{status:400});
 try{await assert.rejects(()=>api('https://example.invalid',{},'ElevenLabs transcription'),e=>/invalid_api_key/.test(e.message)&&!e.message.includes('PRIVATE'));}finally{globalThis.fetch=old;}
});
test('no cloud calls without consent',async()=>{
 const s=newSession();let calls=0;const io={transcribe:async()=>{calls++;return 'pause my print';}};
 const r=await turn(s,{id:'one',audio:'abc',consent:false},io);assert.equal(calls,0);assert.equal(r.ok,false);assert.equal(s.pending,null);
});
test('failed real connection never returns demo readings as live data',async()=>{
 const r=await turn(newSession(),{id:'one',text:'status',source:'home'},{moonraker:async()=>{throw new Error('secret');}});assert.equal(r.printer,null);assert.equal(r.ok,false);assert.doesNotMatch(r.reply,/secret/);
});
