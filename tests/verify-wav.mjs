// Demodulate the generated PCM, checking framing and every cassette byte.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const wav=fs.readFileSync(process.argv[2]??'build/rogue-p6.wav');
assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(4),wav.length-8);
assert.equal(wav.toString('ascii',8,16),'WAVEfmt ');assert.equal(wav.readUInt16LE(20),1);
assert.equal(wav.readUInt16LE(22),1);assert.equal(wav.readUInt32LE(24),48000);assert.equal(wav.readUInt16LE(34),16);
assert.equal(wav.toString('ascii',36,40),'data');assert.equal(wav.readUInt32LE(40),wav.length-44);
const bits=[];
for(let offset=44;offset<wav.length;offset+=80){
 let falling=0,previous=0;
 for(let i=0;i<40;i++){const v=wav.readInt16LE(offset+i*2);if(previous>=0&&v<0)falling++;previous=v;}
 assert(falling===1||falling===2,'Each bit has one or two complete tone cycles');bits.push(falling===2?1:0);
}
const bytes=[];
for(let i=0;i<bits.length;){if(bits[i]){i++;continue;}assert(i+12<=bits.length);let byte=0;for(let j=0;j<8;j++)byte|=bits[i+1+j]<<j;assert.deepEqual(bits.slice(i+9,i+12),[1,1,1]);bytes.push(byte);i+=12;}
assert.deepEqual(Buffer.from(bytes),fs.readFileSync(process.argv[3]??'build/rogue-p6.cas'));
console.log(`WAV demodulation: ${bytes.length} cassette bytes matched; ${(wav.length-44)/96000} seconds.`);
