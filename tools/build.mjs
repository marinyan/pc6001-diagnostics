import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import './build-font.mjs';
const assembler=process.env.SJASMPLUS || 'sjasmplus';
fs.mkdirSync('dist',{recursive:true});
const suites=[['diagnostic','SRDIAG',5],['ports','SRPORT',5],['f3','SRF3V3',9]];
const values=[null,0,7,0x20,0x40,0x80,0xe0,0xe7,0xe6];
const token={CLEAR:0x99,FOR:0x81,TO:0xc3,READ:0x86,POKE:0x94,NEXT:0x82,END:0x80,'=':0xd2};
const peak=Math.round(32767*Math.pow(10,-1/20));
const tones=[0,1].map(bit=>{const b=Buffer.alloc(80);for(let i=0;i<40;i++)b.writeInt16LE(Math.round(peak*Math.sin(2*Math.PI*(bit?2:1)*i/40)),i*2);return b;});
const leader=s=>Buffer.concat(Array(1200*s).fill(tones[1]));
const encode=data=>Buffer.concat([...data].flatMap(v=>[tones[0],...Array.from({length:8},(_,i)=>tones[(v>>i)&1]),tones[1],tones[1],tones[1]]));
const manifest=[];
for(const [id,tapeName,count] of suites){
 const name=`p60gue-sr-${id}`,stem=`dist/${name}`;
 execFileSync(assembler,[`--raw=build/${name}.bin`,`--sym=build/${name}.sym`,`src/${name}.asm`],{stdio:'inherit'});
 const machine=fs.readFileSync(`build/${name}.bin`);
 const lines=['CLEAR 200,57344',`PRINT "${id==='f3'?'SR F3 V3':'SR DIAGNOSTIC'}: COPYING CODE"`,`FOR A=57344 TO ${57343+machine.length}:READ B:POKE A,B:NEXT`,'PRINT "TYPE ONE COMMAND:"',...Array.from({length:count},(_,i)=>`PRINT "TEST ${i+1}: EXEC ${57344+i*3}${id==='f3'?' F3='+(values[i]===null?'KEEP':values[i].toString(16).toUpperCase().padStart(2,'0')):''}"`),'END'];
 for(let i=0;i<machine.length;i+=16)lines.push('DATA '+[...machine.subarray(i,i+16)].join(','));
 const records=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  const body=line.startsWith('DATA ')?Buffer.concat([Buffer.from([0x83]),Buffer.from(line.slice(4))]):line.startsWith('PRINT ')?Buffer.concat([Buffer.from([0x95]),Buffer.from(line.slice(5))]):Buffer.from(line.replace(/CLEAR|FOR|TO|READ|POKE|NEXT|END|=/g,s=>String.fromCharCode(token[s])),'latin1');
  const head=Buffer.alloc(4);head.writeUInt16LE(1);head.writeUInt16LE((i+1)*10,2);records.push(head,body,Buffer.from([0]));
 }
 const tape=Buffer.concat([Buffer.alloc(10,0xd3),Buffer.from(tapeName),...records,Buffer.alloc(9)]);
 const pcm=Buffer.concat([leader(3),encode(tape.subarray(0,16)),leader(1),encode(tape.subarray(16)),leader(1)]);
 const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(pcm.length+36,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(48000,24);h.writeUInt32LE(96000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);
 const outputs={bin:machine,bas:Buffer.from(lines.map((l,i)=>`${(i+1)*10} ${l}`).join('\r\n')),cmt:tape,wav:Buffer.concat([h,pcm])};
 const files={};
 for(const [ext,data] of Object.entries(outputs)){fs.writeFileSync(`${stem}.${ext}`,data);files[ext]={path:`${stem}.${ext}`,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')};}
 manifest.push({id,tapeName,tests:count,loadAddress:57344,machineBytes:machine.length,wavSeconds:pcm.length/96000,peakDbFS:-1,files});
}
fs.writeFileSync('dist/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(manifest.map(({id,machineBytes,wavSeconds})=>({id,machineBytes,wavSeconds})));
