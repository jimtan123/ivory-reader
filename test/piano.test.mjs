import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/piano.js';
const {nameToMidi,nearestSample,rateFor,SAMPLE_NAMES}=globalThis.IvoryPiano;

test('sample file names map to midi numbers, sharps written with s',()=>{
  assert.equal(nameToMidi('C4'),60);
  assert.equal(nameToMidi('Ds4'),63);
  assert.equal(nameToMidi('A1'),33);
});

test('the sample set covers A1 to C7 every minor third',()=>{
  const m=SAMPLE_NAMES.map(nameToMidi);
  assert.equal(m[0],33);assert.equal(m[m.length-1],96);
  for(let i=1;i<m.length;i++)assert.equal(m[i]-m[i-1],3,`gap before ${SAMPLE_NAMES[i]}`);
});

test('a note picks the closest sample, so it is never shifted more than a semitone inside the set',()=>{
  const set=[60,63,66];
  assert.equal(nearestSample(61,set),60);
  assert.equal(nearestSample(62,set),63);
  assert.equal(nearestSample(64,set),63);
  assert.equal(nearestSample(70,set),66);
  assert.equal(nearestSample(40,set),60);
});

test('playback rate shifts the sample by equal-tempered semitones',()=>{
  assert.equal(rateFor(60,60),1);
  assert.ok(Math.abs(rateFor(72,60)-2)<1e-12);
  assert.ok(Math.abs(rateFor(61,60)-Math.pow(2,1/12))<1e-12);
});
