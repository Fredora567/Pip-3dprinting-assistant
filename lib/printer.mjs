import {randomUUID} from 'node:crypto';
export class UserError extends Error {}
export function newPrinter(now=Date.now()) {
  return {job:randomUUID(),file:'little_pumpkin.gcode',state:'printing',progress:.36,elapsed:2160,
    nozzle:205,nozzle_target:205,bed:60,bed_target:60,fan:100,homed_axes:'',updated:now};
}
export function tick(p,now=Date.now()) {
  const seconds=Math.max(0,(now-p.updated)/1000);
  for(const [part,heat,cool] of [['nozzle',2,.6],['bed',.5,.2]]) {
    const target=Math.max(22,p[part+'_target']);
    p[part]=p[part]<target?Math.min(target,p[part]+seconds*heat):Math.max(target,p[part]-seconds*cool);
  }
  if(p.state==='printing') {
    p.elapsed+=seconds;p.progress=Math.min(1,p.progress+seconds/6000);
    if(p.progress===1){p.state='complete';p.nozzle_target=p.bed_target=0;}
  }
  p.updated=now;return {...p};
}
const clean=text=>String(text).toLowerCase().replace(/[.!?,]/g,'').trim().replace(/\s+/g,' ');
export function parseAction(text) {
  if(/\d\.\d/.test(text))throw new UserError('Use a whole-number temperature in degrees Celsius.');
  const q=clean(text).replace(/^please | please$/g,'');
  let m;
  if((m=q.match(/^(pause|resume|cancel|stop)(?: (?:my|the|this))?(?: print| printer)?$/)))return {action:m[1]==='stop'?'cancel':m[1]};
  if(['home','home all','home all axes','home the printer','home my printer','home printer'].includes(q))return {action:'home',axes:'xyz'};
  if((m=q.match(/^home (?:the )?([xyz])(?: axis)?$/)))return {action:'home',axes:m[1]};
  if((m=q.match(/^(?:set|heat) (?:the )?(nozzle|bed)(?: temperature)? to (\d{1,3})(?: degrees)?(?: celsius| c)?$/)))return validate({action:'temperature',part:m[1],value:Number(m[2])});
  if(['turn off the heaters','turn heaters off','cool down','cooldown'].includes(q))return {action:'heaters_off'};
  if(['fan off','turn off the fan','turn the fan off'].includes(q))return {action:'fan',value:0};
  if(['fan on','turn on the fan','turn the fan on'].includes(q))return {action:'fan',value:100};
  if((m=q.match(/^set (?:the )?fan(?: speed)? to (\d{1,3})(?: percent|%)?$/)))return validate({action:'fan',value:Number(m[1])});
  return null;
}
function validate(a) {
  if(a.action==='temperature' && (!['nozzle','bed'].includes(a.part)||!Number.isInteger(a.value)||a.value<0||a.value>(a.part==='nozzle'?280:110)))throw new UserError('Simulation target limit: nozzle 0–280 degrees, bed 0–110 degrees Celsius.');
  if(a.action==='fan'&&(!Number.isInteger(a.value)||a.value<0||a.value>100))throw new UserError('Fan speed must be zero to one hundred percent.');
  if(a.action==='home'&&!['x','y','z','xyz'].includes(a.axes))throw new UserError('Choose X, Y, Z or all axes.');
  if(!['pause','resume','cancel','home','temperature','fan','heaters_off'].includes(a.action))throw new UserError('Unsupported action.');
  return a;
}
export function choice(text) {
  const q=clean(text);
  if(['confirm','yes confirm','confirm please','confirm action'].includes(q))return true;
  if(['cancel','no','no cancel','never mind','nevermind','do not confirm',"don't confirm",'dont confirm'].includes(q))return false;
  return null;
}
export function propose(p,action,now=Date.now()) {
  const a=validate({...action});
  if(a.action==='pause'&&p.state!=='printing')throw new UserError('There is no running print to pause.');
  if(a.action==='resume'&&p.state!=='paused')throw new UserError('The print must be paused before resuming.');
  if(a.action==='cancel'&&!['printing','paused'].includes(p.state))throw new UserError('There is no active print to cancel.');
  if(a.action==='home'&&['printing','paused'].includes(p.state))throw new UserError('Homing is blocked during a running or paused print. Cancel the print first if you intend to abandon it.');
  const descriptions={pause:'Pause the current print',resume:'Resume the paused print',cancel:'Cancel the current print; it cannot be resumed',heaters_off:'Turn both heater targets off',
    home:a.axes==='xyz'?'Home all axes':`Home the ${a.axes?.toUpperCase()} axis`,temperature:`Set the ${a.part} target to ${a.value} degrees Celsius`,fan:`Set the part cooling fan to ${a.value} percent`};
  return {...a,job:p.job,state:p.state,description:descriptions[a.action],token:randomUUID(),expires:now+60000};
}
export function execute(p,pending,token,now=Date.now()) {
  if(!pending||pending.consumed||!token||pending.token!==token||pending.job!==p.job||pending.expires<now)throw new UserError('Confirmation expired or the print changed. Nothing was changed.');
  tick(p,now);
  if(p.state!==pending.state)throw new UserError('Printer state changed. Ask for the action again.');
  propose(p,pending,now);pending.consumed=true;
  switch(pending.action) {
    case 'pause':p.state='paused';return 'Your print is paused.';
    case 'resume':p.state='printing';return 'Your print has resumed.';
    case 'cancel':p.state='cancelled';p.nozzle_target=p.bed_target=0;return 'Your print is cancelled and heater targets are off.';
    case 'heaters_off':p.nozzle_target=p.bed_target=0;return 'Both heater targets are off.';
    case 'fan':p.fan=pending.value;return `The part cooling fan is set to ${p.fan} percent.`;
    case 'temperature':p[pending.part+'_target']=pending.value;return `The ${pending.part} target is now ${pending.value} degrees Celsius.`;
    case 'home':p.homed_axes=[...'xyz'].filter(x=>p.homed_axes.includes(x)||pending.axes.includes(x)).join('');return pending.axes==='xyz'?'All axes are homed.':`The ${pending.axes.toUpperCase()} axis is homed.`;
  }
}
export function quickReply(text,p) {
  const q=clean(text).replace(/'/g,'');
  const percent=Number.isFinite(p.progress)?`${Math.round(Math.max(0,Math.min(1,p.progress))*100)}% complete`:'progress unavailable';
  if(['status','print status','how is my print doing','hows my print doing','how is the print doing','whats the status','what is the printer doing'].includes(q))return `Your print is ${p.state}, ${percent}.`;
  if(['how far along is my print','what is the progress','whats the progress','how much is done'].includes(q))return `Your print is ${percent}.`;
  if(['help','what can you do','list commands','what commands can i use'].includes(q))return 'Ask about status, temperatures, progress or the print file. Request pause, resume, cancel, fan speed, heater targets or homing. Actions need spoken confirmation.';
  if(['what is printing','whats printing','what file is printing'].includes(q))return `The selected file is ${p.file||'not reported'}.`;
  if(['how long has it been printing','elapsed time','how much time has passed'].includes(q))return Number.isFinite(p.elapsed)?`Active print time is ${Math.round(p.elapsed/60)} minutes.`:'Elapsed time is not reported.';
  if(['how long is left','when will it finish','how long until it finishes'].includes(q))return 'I do not have a reliable remaining-time estimate from this snapshot.';
  if(['homing status','are the axes homed','is the printer homed'].includes(q))return `Homed axes: ${p.homed_axes?.toUpperCase()||'not reported'}.`;
  if(['fan speed','what is the fan speed','whats the fan speed'].includes(q))return Number.isFinite(p.fan)?`The fan is at ${p.fan} percent.`:'Fan speed is not reported.';
  for(const part of ['nozzle','bed']) {
    const temp=p[part],target=p[part+'_target'];
    if([`${part} temperature`,`what is the ${part} temperature`,`whats the ${part} temperature`,`how hot is the ${part}`].includes(q))return Number.isFinite(temp)?`The ${part} is ${Math.round(temp)} degrees Celsius.`:`The ${part} temperature is not reported.`;
    if([`${part} target`,`what is the ${part} target`,`whats the ${part} target`].includes(q))return Number.isFinite(target)?`The ${part} target is ${Math.round(target)} degrees Celsius.`:`The ${part} target is not reported.`;
    if([`is the ${part} heating`,`is the ${part} still heating`].includes(q))return Number.isFinite(temp)&&Number.isFinite(target)?`The ${part} is ${Math.round(temp)} degrees, with a target of ${Math.round(target)}.`:'Temperature data is not available.';
  }
  return null;
}
