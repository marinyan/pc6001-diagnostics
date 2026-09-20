// Integration: cold N60m boot -> cassette CLOAD -> BASIC RUN -> game.
// No program-load, register mutation, or RAM writes through the debugger.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const f3=process.argv.includes('--f3'),count=f3?9:5;
const stem=f3?'p60gue-sr-f3':process.argv.includes('--ports')?'p60gue-sr-ports':'p60gue-sr-diagnostic';
const session=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));
assert.equal(new URL(session.url).hostname,'127.0.0.1');
const headers={'X-Lab-Token':session.token,'Content-Type':'application/json'};
const workspace=await (await fetch(session.url+'/api/workspace',{headers})).json();
assert.equal(workspace.workspaceId,session.workspaceId);
const target=workspace.instances.find(x=>x.handle==='progue-p6-tape');
assert(target);assert.equal(target.model,'pc6001mk2');assert.equal(target.mode,'N60m');
async function call(data){const r=await fetch(session.url+target.apiUrl,{method:'POST',headers,body:JSON.stringify({...data,instanceId:target.instanceId,requestId:crypto.randomUUID()})});const result=await r.json();if(!r.ok)throw Error(JSON.stringify(result.error));return result;}
const meta={basicBytes:fs.statSync('dist/'+stem+'.cmt').size},s={};for(const l of fs.readFileSync('build/'+stem+'.sym','utf8').split(/\r?\n/)){const m=l.match(/^(\S+): EQU 0x([0-9A-F]+)/i);if(m)s[m[1]]=parseInt(m[2],16);}
const tape=fs.readFileSync('dist/'+stem+'.cmt');
const read=async(address,length)=>Buffer.from((await call({op:'read-space',space:'internal-ram',address,length})).hex,'hex');
const run=pc=>call({op:'run-until',pc,maxCycles:3993600,maxInstructions:1000000});
async function frames(n){while(n>0){const part=Math.min(n,60);await call({op:'run-until',pc:0xffff,maxCycles:Math.floor(3993600*part/60),maxInstructions:1000000});n-=part;}}
async function key(code){await call({op:'key',port:code>>3,bit:code&7,down:true});await frames(3);await call({op:'key',port:code>>3,bit:code&7,down:false});await frames(3);}
async function type(str){for(const ch of str)await key(ch.charCodeAt(0));}
await call({op:'pause'});await frames(60);
assert.match((await call({op:'text'})).text,/SELECT BASIC MODE/,'Requires a freshly booted emulator');
await key(53);await frames(30);await key(51);await key(13);await frames(120);
assert.match((await call({op:'text'})).text,/Bytes free/);
await call({op:'cassette-mount',format:'cas',hex:tape.toString('hex'),sha256:crypto.createHash('sha256').update(tape).digest('hex')});
await call({op:'cassette-play',enabled:true});await type('CLOAD\r');
let state;
for(let i=0;i<90;i++){await frames(60);state=await call({op:'device-state',device:'pc6001mk2'});if(state.cassettePosition&&!state.relayOn)break;}
assert.equal(state.cassettePosition,meta.basicBytes,'BASIC consumes exactly its cassette record');assert.equal(state.relayOn,false);
console.log('CLOAD completed:',state.cassettePosition,'bytes');
await frames(30);console.log((await call({op:'text'})).text.trim());
await type('RUN\r');
let copied=false;
for(let i=0;i<60;i++) { await frames(60); if((await call({op:'text'})).text.includes(`TEST ${count}: EXEC`)) { copied=true; break; } }
assert(copied,'BASIC copies diagnostic and prints entry commands');
await frames(60);
assert.deepEqual(await read(0xe000,fs.statSync('dist/'+stem+'.bin').size),fs.readFileSync('dist/'+stem+'.bin'));
const saved=(await call({op:'checkpoint'})).checkpointId;
for(let n=1;n<=count;n++) {
 await call({op:'restore',checkpointId:saved});
 await type(`EXEC ${57344+(n-1)*3}\r`);
 let reached=false;
 for(let i=0;i<20;i++)if((await run(s.blink)).conditionMatched){reached=true;break;}
 assert(reached,`Probe ${n} reaches blink`);
 assert.equal((await read(s.probe_number,1))[0],48+n);
 const before=(await read(s.blink_value,1))[0];
 assert((await run(s.delay)).conditionMatched);
 assert.equal((await read(0x2c80,1))[0],before^255,'CPU writes blinking marker');
 assert((await read(0x23c0,320)).some(b=>b!==0),'Title pixels are written');
 fs.writeFileSync(`build/${stem}-${n}.png`,Buffer.from((await call({op:'observe',captureFrame:true})).framePng,'base64'));
 console.log(`Probe ${n}: BASIC EXEC, title RAM and blinking marker passed`);
}


