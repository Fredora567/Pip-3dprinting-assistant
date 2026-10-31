import test from 'node:test';import assert from 'node:assert/strict';import {Readable} from 'node:stream';
import {handler} from '../server.mjs';
async function request(path,{method='GET',headers={},data}={}) {
 const req=Readable.from(data===undefined?[]:[Buffer.from(JSON.stringify(data))]);Object.assign(req,{url:path,method,headers});
 const res={headers:{},status:200,setHeader(k,v){this.headers[k]=v;},writeHead(code,h={}){this.status=code;Object.assign(this.headers,h);this.headersSent=true;},end(data){this.body=Buffer.isBuffer(data)?data.toString():String(data||'');}};
 await handler(req,res);return res;
}
test('server does not expose secrets, libraries or unlisted files',async()=>{
 for(const path of ['/.env','/lib/providers.mjs','/server.mjs','/../.env','/package.json'])assert.equal((await request(path)).status,404);
 const page=await request('/');assert.equal(page.status,200);assert.match(page.body,/voice-frame/);
});
test('session config reports booleans, not secret values',async()=>{
 const previous=process.env.ELEVENLABS_API_KEY;process.env.ELEVENLABS_API_KEY='TEST-PRIVATE-KEY';
 try{const result=await request('/api/state');const data=JSON.parse(result.body);assert.equal(data.elevenlabs,true);assert.doesNotMatch(result.body,/TEST-PRIVATE-KEY/);assert.ok(data.csrf);assert.match(result.headers['Set-Cookie'],/HttpOnly/);}finally{if(previous===undefined)delete process.env.ELEVENLABS_API_KEY;else process.env.ELEVENLABS_API_KEY=previous;}
});
test('mutating requests require a session CSRF token',async()=>{
 const first=await request('/api/state');const cookie=first.headers['Set-Cookie'].split(';')[0];const data=JSON.parse(first.body);
 let result=await request('/api/reset',{method:'POST',headers:{cookie,'content-type':'application/json'},data:{}});assert.equal(result.status,403);
 result=await request('/api/reset',{method:'POST',headers:{cookie,'content-type':'application/json','x-pip-csrf':data.csrf},data:{}});assert.equal(result.status,200);
});
