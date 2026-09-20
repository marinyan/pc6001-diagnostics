import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
for(const suite of JSON.parse(fs.readFileSync('dist/manifest.json','utf8'))){
 for(const file of Object.values(suite.files)){
  const data=fs.readFileSync(file.path);
  assert.equal(data.length,file.bytes);
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'),file.sha256);
 }
 execFileSync(process.execPath,['tests/verify-wav.mjs',suite.files.wav.path,suite.files.cmt.path],{stdio:'inherit'});
 const basic=fs.readFileSync(suite.files.bas.path,'utf8');
 const bytes=basic.split(/\r?\n/).filter(l=>/^\d+ DATA /.test(l)).flatMap(l=>l.replace(/^\d+ DATA /,'').split(',').map(Number));
 assert.deepEqual(Buffer.from(bytes),fs.readFileSync(suite.files.bin.path),'BASIC DATA matches machine code');
 const cmt=fs.readFileSync(suite.files.cmt.path);
 assert.equal(cmt.toString('ascii',10,16),suite.tapeName);
 let at=16;
 for(const line of basic.split(/\r?\n/)){
  assert.equal(cmt.readUInt16LE(at),1);assert.equal(cmt.readUInt16LE(at+2),Number(line.split(' ')[0]));
  const end=cmt.indexOf(0,at+4);assert(end>at+4);
  const source=line.replace(/^\d+ /,'');
  if(source.startsWith('DATA ')) {assert.equal(cmt[at+4],0x83);assert.equal(cmt.toString('ascii',at+5,end),source.slice(4));}
  at=end+1;
 }
 assert.deepEqual(cmt.subarray(at),Buffer.alloc(9));
 console.log(`${suite.id}: hashes, BASIC DATA and cassette framing verified`);
}
