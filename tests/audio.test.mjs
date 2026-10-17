import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EssPlayer, ESS_ASSET, PLAYBACK_GAIN } from '../.pose-test/audio/EssPlayer.js';
import { calibrationReducer as reduce, initialState } from '../.pose-test/calibration/machine.js';
function fixture({suspended=false, fetchError=false, decodeError=false, startError=false}={}) {
 const sources=[], gains=[]; let fetches=0, decodes=0, resumes=0;
 const context={state:suspended?'suspended':'running',currentTime:0,destination:{},onstatechange:null,
  async resume(){resumes++;this.state='running';}, async close(){this.state='closed';},
  async decodeAudioData(){decodes++;if(decodeError)throw Error('decode');return {duration:3};},
  createGain(){const gain={gain:{value:1},connect(){},disconnect(){}};gains.push(gain);return gain;},
  createBufferSource(){const source={buffer:null,onended:null,started:false,stopped:false,connect(){},disconnect(){},start(){if(startError)throw Error('start');this.started=true;},stop(){this.stopped=true;},finish(){this.onended?.();}};sources.push(source);return source;}
 };
 const player=new EssPlayer('/'+ESS_ASSET,()=>context,async()=>{fetches++; if(fetchError)throw Error('fetch');return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};});
 return {player,context,sources,gains,stats:()=>({fetches,decodes,resumes})};
}
test('all eight directions share one fetch, decode and buffer; only natural audio completion advances',async()=>{
 const f=fixture(); let state=reduce(reduce(initialState,{type:'START'}),{type:'READY'});
 for(let step=0;step<8;step++){
  await f.player.prepare();state=reduce(state,{type:'CONFIRM'});
  for(let i=0;i<3;i++)state=reduce(state,{type:'TICK'});
  assert.equal(state.phase,'playing');assert.equal(state.completed,step);assert.equal(reduce(state,{type:'NEXT'}),state);
  let ends=0; f.player.play(()=>{ends++;state=reduce(state,{type:'AUDIO_ENDED'});});
  assert.equal(ends,0);assert.equal(f.gains[step].gain.value,PLAYBACK_GAIN);
  f.sources[step].finish();assert.equal(ends,1);assert.equal(state.completed,step+1);state=reduce(state,{type:'NEXT'});
 }
 assert.equal(state.phase,'complete');assert.deepEqual(f.stats(),{fetches:1,decodes:1,resumes:0});assert.ok(f.sources.every(source=>source.buffer===f.sources[0].buffer));
});
test('stop cancels stale completion; repeated play stops the preceding source',async()=>{
 const f=fixture();await f.player.prepare();let ends=0;f.player.play(()=>ends++);const stale=f.sources[0].onended;
 f.player.play(()=>ends++);assert.equal(f.sources[0].stopped,true);stale();assert.equal(ends,0);
 const last=f.sources[1].onended;f.player.stop();last();assert.equal(ends,0);assert.equal(f.sources[1].stopped,true);
});
test('suspended context resumes from preparation; progress is based on the audio clock',async()=>{
 const f=fixture({suspended:true});await Promise.all([f.player.prepare(),f.player.prepare()]);assert.deepEqual(f.stats(),{fetches:1,decodes:1,resumes:1});f.player.play(()=>{});f.context.currentTime=1.25;assert.equal(f.player.remaining,1.75);f.player.dispose();assert.equal(f.sources[0].stopped,true);
});
test('loading, decode, start errors reject without a completed direction',async()=>{
 for(const option of ['fetchError','decodeError']){const f=fixture({[option]:true});await assert.rejects(f.player.prepare());}
 const f=fixture({startError:true});await f.player.prepare();assert.throws(()=>f.player.play(()=>assert.fail('must not complete')));assert.equal(f.sources[0].stopped,true);
});
test('audio interruption stops sound and requests a sequence pause',async()=>{
 const f=fixture();await f.player.prepare();let pauses=0;f.player.onInterrupted=()=>pauses++;f.player.play(()=>assert.fail('interrupted is not completed'));f.context.state='suspended';f.context.onstatechange();assert.equal(pauses,1);assert.equal(f.sources[0].stopped,true);
});
test('late loading cannot start audio by itself after exit/stop',async()=>{
 let release;const f=fixture();const player=new EssPlayer('/'+ESS_ASSET,()=>f.context,()=>new Promise(resolve=>release=resolve));
 const pending=player.prepare();player.stop();release({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await pending;assert.equal(f.sources.length,0);
});
test('default browser fetch is invoked without binding the player as its receiver',async()=>{
 const original=globalThis.fetch;const f=fixture();let receiver;
 globalThis.fetch=async function(){receiver=this;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};
 try{const player=new EssPlayer('/'+ESS_ASSET,()=>f.context);await player.prepare();assert.equal(receiver,undefined);player.dispose();}finally{globalThis.fetch=original;}
});
test('failed load can be retried; suspended and malformed audio cannot play',async()=>{
 const f=fixture();let calls=0;const player=new EssPlayer('/'+ESS_ASSET,()=>f.context,async()=>({ok:++calls>1,arrayBuffer:async()=>new ArrayBuffer(8)}));
 await assert.rejects(player.prepare());await player.prepare();assert.equal(calls,2);f.context.state='suspended';assert.throws(()=>player.play(()=>assert.fail('must not complete')));
 const bad=fixture();bad.context.decodeAudioData=async()=>({duration:2});await assert.rejects(new EssPlayer('/'+ESS_ASSET,()=>bad.context,async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})).prepare());
});

test('committed asset is 3 seconds of mono PCM16 at 48 kHz with zero endpoints and headroom',()=>{
 const wav=readFileSync(new URL('../public/audio/ess-200-8000-3s.wav',import.meta.url));
 assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
 let format,data;for(let offset=12;offset+8<=wav.length;){const id=wav.toString('ascii',offset,offset+4);const size=wav.readUInt32LE(offset+4);if(id==='fmt ')format=wav.subarray(offset+8,offset+8+size);if(id==='data')data=wav.subarray(offset+8,offset+8+size);offset+=8+size+(size%2);}
 assert.equal(format.readUInt16LE(0),1);assert.equal(format.readUInt16LE(2),1);assert.equal(format.readUInt32LE(4),48000);assert.equal(format.readUInt16LE(14),16);assert.equal(data.length,144000*2);assert.equal(data.readInt16LE(0),0);assert.equal(data.readInt16LE(data.length-2),0);
 for(let i=0;i<data.length;i+=2)assert.ok(Math.abs(data.readInt16LE(i))<=6554);
});
