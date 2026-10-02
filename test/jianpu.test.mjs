import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/parse.js';
const {parsePiece,jianpu}=globalThis.IvoryParse;

// numbered notation for every pitch of a one-bar RH line
function nums(key,rh){
  const p=parsePiece(`title: T\ntime: 4/4\nkey: ${key}\ntempo: 80\nRH: ${rh}`);
  assert.deepEqual(p.errors,[]);
  return p.parts.RH[0].notes.map(n=>{const j=jianpu(n.pitches[0],p.key.count);return j.acc+j.num+(j.dots>0?"'".repeat(j.dots):',' .repeat(-j.dots));});
}

test('in C, middle C is 1 with no dot; the octave above is dotted above, below is dotted below',()=>{
  assert.deepEqual(nums('C','C4/q B4/q C5/q B3/q'),['1','7',"1'",'7,']);
  assert.deepEqual(nums('C','G3/q A3/q E5/q F5/q'),['5,','6,',"3'","4'"]);
});

test('two octaves away gives two dots',()=>{
  assert.deepEqual(nums('C','C6/q C2/q C3/h'),["1''",'1,,','1,']);
});

test('the number follows the key: in G, G4 is 1 and F#4 is 7 below it',()=>{
  assert.deepEqual(nums('G','G4/q A4/q F4/q D5/q'),['1','2','7,','5']);
});

test('flat keys and minor keys read from the major tonic',()=>{
  assert.deepEqual(nums('Bb','B4/q F5/q E5/q A4/q'),['1','5','4','7,']);
  assert.deepEqual(nums('Am','A4/q C5/q E4/q G#4/q'),['6',"1'",'3','#5']);
});

test('notes outside the scale carry a sharp or flat',()=>{
  assert.deepEqual(nums('C','C#4/q Eb4/q F#4/q Bb4/q'),['#1','b3','#4','b7']);
});
