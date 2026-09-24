import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import '../src/parse.js';
import '../src/fingers.js';
const {parsePiece}=globalThis.IvoryParse;
const {plan,at}=globalThis.IvoryFingers;

const head='title: T\ntime: 4/4\nkey: C\ntempo: 80\n';
const name=m=>['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][m%12]+(Math.floor(m/12)-1);

test('a finger after a pitch is read, single notes and chords',()=>{
  const p=parsePiece(head+'RH: E4@3/q D4/q C4@1/h\nLH: [C3@5 G3@1]/w');
  assert.deepEqual(p.errors,[]);
  assert.equal(p.parts.RH[0].notes[0].pitches[0].finger,3);
  assert.equal(p.parts.RH[0].notes[1].pitches[0].finger,undefined);
  assert.deepEqual(p.parts.LH[0].notes[0].pitches.map(x=>x.finger),[5,1]);
});

test('a finger outside 1 to 5 is an error',()=>{
  const p=parsePiece(head+'RH: E4@7/w');
  assert.ok(p.errors.some(e=>e.includes('bad finger')));
});

test('one printed finger places the hand and every later note gets its finger',()=>{
  const p=parsePiece(head+'RH: A4@3/q G4/q F4/q G4/q | A4/q C5/q C5/h\nLH: [F3@5 C4@1]/w | C4/w');
  const h=plan(p);
  assert.equal(h.RH.length,1);
  assert.deepEqual(h.RH[0].keys.map(name),['F4','G4','A4','B4','C5']);
  assert.deepEqual(p.parts.RH[0].notes.map(n=>n.pitches[0].auto),[3,2,1,2]);
  assert.equal(p.parts.RH[1].notes[1].pitches[0].auto,5);
  // left hand counts the other way: thumb on the top key
  assert.deepEqual(h.LH[0].keys.map(name),['C4','B3','A3','G3','F3']);
  assert.equal(p.parts.LH[1].notes[0].pitches[0].auto,1);
});

test('a printed finger that disagrees with the hand moves it, and marks the note',()=>{
  // This Old Man: 4 on G puts the thumb on D; later 1 on C moves it down to C
  const p=parsePiece(head+'RH: G4@4/q E4/q G4/h | G4@4/q C4@1/q C4/h');
  const h=plan(p);
  assert.equal(h.RH.length,2);
  assert.equal(name(h.RH[0].keys[0]),'D4');
  assert.equal(name(h.RH[1].keys[0]),'C4');
  assert.equal(h.RH[1].beat,5);
  assert.equal(p.parts.RH[0].notes[1].pitches[0].auto,2);
  assert.ok(p.parts.RH[0].notes[0].move);
  assert.ok(!p.parts.RH[1].notes[0].move);   // 4 on G agrees with the D placement
  assert.ok(p.parts.RH[1].notes[1].move);
  assert.equal(at(h.RH,4.5),h.RH[0]);
  assert.equal(at(h.RH,5),h.RH[1]);
});

test('a sharp the piece plays replaces the plain key under that finger',()=>{
  const p=parsePiece(head+'RH: A4@5/e G4/e F#4/e E4/e D4@1/h');
  assert.deepEqual(plan(p).RH[0].keys.map(name),['D4','E4','F#4','G4','A4']);
  assert.equal(p.parts.RH[0].notes[2].pitches[0].auto,3);
});

test('a note out of reach of the placement gets no finger',()=>{
  const p=parsePiece(head+'RH: C4@1/h A4/h');
  plan(p);
  assert.equal(p.parts.RH[0].notes[1].pitches[0].auto,null);
});

test('a stretched chord keeps its printed fingers and names no other keys',()=>{
  // Swan Lake: left hand third A3-C4 played 2-1
  const p=parsePiece(head+'LH: [E3@5 G3@3]/w | [A3@2 C4@1]/w | [E3@5 G3@3]/w');
  const h=plan(p);
  assert.equal(h.LH.length,3);
  assert.equal(h.LH[1].stretch,true);
  assert.deepEqual(h.LH[1].keys.map(k=>k&&name(k)),['C4','A3',null,null,null]);
  assert.deepEqual(p.parts.LH[1].notes[0].pitches.map(x=>x.auto),[2,1]);
  assert.equal(h.LH[2].stretch,false);
});

test('a piece with no printed fingers has no placements',()=>{
  const p=parsePiece(head+'RH: C4/w\nLH: C3/w');
  const h=plan(p);
  assert.deepEqual(h,{RH:[],LH:[]});
  assert.equal(p.parts.RH[0].notes[0].pitches[0].auto,undefined);
});

// The built-in pieces live in src/script.html; every one must parse cleanly,
// and every lesson with printed fingers must give each sounding note a finger.
test('every built-in piece parses, and fingered lessons finger every note',()=>{
  const src=readFileSync(new URL('../src/script.html',import.meta.url),'utf8');
  const body=src.slice(src.indexOf('const BUILTIN={')+'const BUILTIN='.length);
  const BUILTIN=Function('return '+body.slice(0,body.indexOf('\n};')+3))();
  const ids=Object.keys(BUILTIN);
  assert.ok(ids.length>=10);
  ids.forEach(id=>{
    const p=parsePiece(BUILTIN[id]);
    assert.deepEqual(p.errors,[],id);
    const h=plan(p);
    ['RH','LH'].forEach(hand=>{
      if(!h[hand].length)return;
      Object.keys(p.parts).filter(k=>k.startsWith(hand)).forEach(part=>p.parts[part].forEach((b,mi)=>b.notes.forEach(n=>{
        if(n.rest)return;
        n.pitches.forEach(x=>assert.ok(x.auto>=1&&x.auto<=5,`${id} ${part} bar ${mi+1} ${name(x.m)} has no finger`));
      })));
    });
  });
});
