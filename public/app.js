const $=id=>document.getElementById(id),frame=$('voice-frame');
let csrf='',locked=false,busy=false,current={reply_id:'',reply:'',audio:'',confirmation_token:''};
function error(message){$('error').textContent=message;$('error').hidden=!message;}
function settings(){return {source:$('source').value,consent:$('consent').checked,gemma:$('gemma').checked,voice:true};}
function renderVoice(){frame.contentWindow?.postMessage({type:'streamlit:render',args:{...current,enabled:$('consent').checked&&!locked&&$('keys').dataset.eleven==='yes',wake_name:$('wake').checked,reduced:$('reduced').checked,threshold:Number($('threshold').value)/1000}},location.origin);}
function printer(p){
  const home=$('source').value==='home';
  $('source-note').textContent=home?'Home printer · Read-only snapshots per question · Hosted preview usually cannot reach your home LAN':'Printer 01 · Simulation · No hardware connected';
  $('metrics').hidden=$('bar').hidden=!p;
  if(!p){$('printer-state').textContent='No current printer snapshot. Ask a question to refresh it.';return;}
  const fmt=x=>Number.isFinite(x)?Math.round(x)+' °C':'Unknown';
  $('progress').textContent=Number.isFinite(p.progress)?Math.round(p.progress*100)+'%':'Unknown';$('bar').value=p.progress||0;
  $('nozzle').textContent=fmt(p.nozzle);$('bed').textContent=fmt(p.bed);
  $('nozzle-target').textContent='Target: '+fmt(p.nozzle_target);$('bed-target').textContent='Target: '+fmt(p.bed_target);
  $('printer-state').textContent=`${p.file} · ${p.state} · Homed: ${p.homed_axes?.toUpperCase()||'not yet'}`;
}
async function call(path,data){const response=await fetch(path,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json','X-Pip-CSRF':csrf}:{},body:data?JSON.stringify(data):undefined});const result=await response.json();if(!response.ok)throw new Error(result.error||'Request failed.');return result;}
async function load(){try{const s=await call('/api/state');csrf=s.csrf;locked=s.locked;$('unlock').hidden=!locked;$('keys').textContent=`Google: ${s.google?'configured':'missing'} · ElevenLabs: ${s.elevenlabs?'configured':'missing'}`;$('keys').dataset.eleven=s.elevenlabs?'yes':'no';if(!s.google)$('gemma').checked=false;printer($('source').value==='home'?null:s.printer);renderVoice();}catch{error('Could not load the app. Reload the preview.');}}
async function submit(event){
  if(busy)return;busy=true;error('');
  try{
    const result=await call('/api/turn',{...event,...settings()});
    current={reply_id:result.id,reply:result.reply,audio:result.audio,confirmation_token:result.confirmation_token};
    $('conversation').hidden=false;$('you').textContent=result.question;$('reply').textContent=result.reply;
    $('pending').hidden=!result.pending;$('pending').textContent=result.pending+' · Say confirm or cancel after the chime.';
    $('timings').textContent=Object.entries(result.timings).map(([name,value])=>`${name}: ${value.toFixed(2)} seconds`).join('\n');
    printer(result.printer);renderVoice();
  }catch(e){error(e.message);current={reply_id:event.id,reply:e.message,audio:'',confirmation_token:''};renderVoice();}
  finally{busy=false;}
}
window.addEventListener('message',event=>{
  if(event.source!==frame.contentWindow||event.origin!==location.origin||!event.data?.isStreamlitMessage)return;
  if(event.data.type==='streamlit:componentReady')renderVoice();
  if(event.data.type==='streamlit:setFrameHeight')frame.style.height=Math.min(900,Math.max(360,Number(event.data.height)||460))+'px';
  if(event.data.type==='streamlit:setComponentValue')submit(event.data.value);
});
for(const id of ['consent','gemma','wake','reduced','threshold'])$(id).addEventListener('change',()=>{renderVoice();if(id==='reduced')document.body.classList.toggle('reduced',$('reduced').checked);});
$('source').addEventListener('change',()=>{current={reply_id:'',reply:'',audio:'',confirmation_token:''};frame.src='/voice.html?session='+Date.now();$('pending').hidden=true;load();});
$('reset').onclick=async()=>{try{await call('/api/reset',{});current={reply_id:'',reply:'',audio:'',confirmation_token:''};frame.src='/voice.html?session='+Date.now();$('conversation').hidden=$('pending').hidden=true;load();}catch(e){error(e.message);}};
$('unlock').onsubmit=async event=>{event.preventDefault();try{await call('/api/unlock',{password:$('password').value});$('password').value='';error('');load();}catch(e){error(e.message);}};
$('text-form').onsubmit=event=>{event.preventDefault();const text=$('question').value.trim();if(!text)return;submit({id:crypto.randomUUID(),text,confirmation_token:current.confirmation_token});$('question').value='';};
frame.addEventListener('load',renderVoice);load();
