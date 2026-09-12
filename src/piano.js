/* Ivory Reader piano sound: sampled grand piano.
   Samples are the Salamander Grand Piano (Alexander Holm, CC BY 3.0), one
   recording every minor third from A1 to C7; other pitches play the nearest
   sample shifted by at most one semitone. Plain script, no DOM: the pure
   helpers are tested in test/piano.test.mjs. Leaves one global, IvoryPiano. */
(function(){
'use strict';
const SAMPLE_NAMES=['A1','C2','Ds2','Fs2','A2','C3','Ds3','Fs3','A3','C4','Ds4','Fs4','A4','C5','Ds5','Fs5','A5','C6','Ds6','Fs6','A6','C7'];
const SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
// "Ds4" is D sharp 4: file names cannot hold a # character.
function nameToMidi(name){const m=name.match(/^([A-G])(s?)(\d)$/);if(!m)return null;return (+m[3]+1)*12+SEMI[m[1]]+(m[2]?1:0);}
function nearestSample(m,set){let best=set[0];for(const s of set)if(Math.abs(s-m)<Math.abs(best-m))best=s;return best;}
const rateFor=(m,sampleMidi)=>Math.pow(2,(m-sampleMidi)/12);

const player={buffers:new Map(),keys:[],ready:false,loading:null};
// source(name) resolves to an ArrayBuffer of the mp3; the caller decides whether
// that comes from a fetch (the site) or from embedded base64 (the claude.ai copy).
function load(ctx,source){
  if(player.loading)return player.loading;
  player.loading=Promise.all(SAMPLE_NAMES.map(async name=>{
    try{const ab=await source(name);const buf=await ctx.decodeAudioData(ab);player.buffers.set(nameToMidi(name),buf);}catch(e){}
  })).then(()=>{player.keys=[...player.buffers.keys()].sort((a,b)=>a-b);player.ready=player.keys.length>0;return player.ready;});
  return player.loading;
}
// Plays midi note m at time t for dur seconds, then a short natural release.
// Returns false when the samples are not loaded yet so the caller can fall back.
function noteAt(ctx,m,t,dur,dest,gain){
  if(!player.ready)return false;
  const s=nearestSample(m,player.keys),buf=player.buffers.get(s);
  const src=ctx.createBufferSource();src.buffer=buf;src.playbackRate.value=rateFor(m,s);
  const g=ctx.createGain(),v=gain==null?0.9:gain,end=t+Math.max(0.05,dur),rel=0.3;
  g.gain.setValueAtTime(v,t);g.gain.setValueAtTime(v,end);g.gain.exponentialRampToValueAtTime(0.0001,end+rel);
  src.connect(g);g.connect(dest||ctx.destination);src.start(t);src.stop(end+rel+0.05);
  return true;
}
globalThis.IvoryPiano={SAMPLE_NAMES,nameToMidi,nearestSample,rateFor,load,noteAt,get ready(){return player.ready;},get count(){return player.keys.length;}};
})();
