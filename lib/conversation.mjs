import {newPrinter,tick,parseAction,propose,execute,choice,quickReply,UserError} from './printer.mjs';
import * as providers from './providers.mjs';
export function newSession(){return {printer:newPrinter(),pending:null,history:[],seen:new Set(),busy:false,lastTurn:0};}
export async function turn(session,input,io=providers) {
  if(!input||typeof input.id!=='string'||input.id.length>100)throw new UserError('Invalid turn ID.');
  if(session.seen.has(input.id))throw new UserError('This turn was already processed. Record a new question.');
  if(session.busy)throw new UserError('Pip is already answering.');
  session.seen.add(input.id);if(session.seen.size>100)session.seen.delete(session.seen.values().next().value);
  session.busy=true;const pending=session.pending;session.pending=null;
  let question='',reply='',audio='',ok=false,observed=null;const timings={},begin=performance.now();
  const timed=async(name,fn)=>{const start=performance.now();try{return await fn();}finally{timings[name]=Math.round(performance.now()-start)/1000;}};
  try {
    if(input.kind==='confirmation_timeout')throw new UserError('Confirmation timed out. No action was performed.');
    if(input.audio) {
      if(input.consent!==true)throw new UserError('Enable cloud permission before sending speech.');
      question=await timed('Transcription',()=>io.transcribe(input.audio));
    } else {
      if(typeof input.text!=='string'||!input.text.trim()||input.text.length>1000)throw new UserError('Type or record a short question.');
      question=input.text.trim();
    }
    const simulation=input.source!=='home';
    const snapshot=await timed('Printer status',()=>simulation?tick(session.printer):io.moonraker());
    observed=snapshot;
    const decision=choice(question);
    if(pending) {
      if(!simulation)reply='Real printer mode is read only. Nothing changed.';
      else if(input.confirmation_token!==pending.token)reply='The confirmation did not match. Nothing changed.';
      else if(decision===true)reply=execute(session.printer,pending,input.confirmation_token);
      else reply=decision===false?'Request dismissed. Nothing changed.':'I did not hear confirm or cancel. Request dismissed; nothing changed.';
    } else if(decision!==null&&!parseAction(question))reply='There is no action waiting for confirmation.';
    else {
      const action=parseAction(question);
      if(action) {
        if(!simulation)reply='Real printer mode is read only. Use Mainsail or Fluidd for controls.';
        else {session.pending=propose(snapshot,action);reply=session.pending.description+'? After the chime, say confirm or cancel. No Pip needed.';}
      } else {
        reply=quickReply(question,snapshot);
        if(!reply&&input.gemma&&input.consent===true)reply=await timed('Gemma',()=>io.answer(question,snapshot,session.history,simulation));
        if(!reply)reply=`Your print is ${snapshot.state}. Enable Gemma and cloud permission for other questions.`;
      }
    }
    session.history=[...session.history,{user:question,pip:reply}].slice(-6);ok=true;
    if(input.voice&&input.consent===true) {
      try{audio=(await timed('Speech generation',()=>io.speak(reply))).toString('base64');}
      catch(error){session.pending=null;reply+='\n'+(error instanceof UserError?error.message:'Voice generation failed.');}
    }
    // An unspoken proposal cannot create a voice confirmation window. Typed
    // requests can still be confirmed by typing the exact word and token.
  } catch(error) {
    reply=error instanceof UserError?error.message:'That turn failed. No printer action was performed.';
    session.pending=null;
  } finally {session.busy=false;}
  timings.total=Math.round(performance.now()-begin)/1000;
  return {id:input.id,question,reply,audio,ok,timings,confirmation_token:session.pending?.token||'',pending:session.pending?.description||'',printer:input.source==='home'?observed:tick(session.printer)};
}
