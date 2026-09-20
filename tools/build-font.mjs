import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
process.chdir(root);
fs.mkdirSync('build',{recursive:true});
const bdfPath='assets/misaki-ascii.bdf';
const bdf=fs.readFileSync(bdfPath,'utf8');
const font=Buffer.alloc(96*8);
let count=0;
for(const block of bdf.split('STARTCHAR ').slice(1)){
 const code=Number(block.match(/ENCODING (\d+)/)?.[1]);
 if(code<32||code>127)continue;
 const [,w,h,x,y]=block.match(/BBX (\d+) (\d+) (-?\d+) (-?\d+)/).map(Number);
 const advance=Number(block.match(/DWIDTH (\d+)/)[1]);
 if(advance!==4)throw new Error(`Not half width: ${code}`);
 const rows=block.split('BITMAP')[1].split('ENDCHAR')[0].trim().split(/\s+/);
 for(let r=0;r<h;r++)for(let col=0;col<w;col++){
  const yy=7-y-h+r,xx=x+col;
  if(xx<0||xx>=4||yy<0||yy>=8)throw new Error(`Glyph outside 4x8: ${code}`);
  if(parseInt(rows[r],16)&(1<<(Math.ceil(w/8)*8-col-1)))font[(code-32)*8+yy]|=0x80>>xx;
 }
 count++;
}
if(count<95)throw new Error('Missing ASCII glyphs');
fs.writeFileSync('build/font.bin',font);
