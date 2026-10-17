import { PRE_ROLL_SECONDS, POST_ROLL_SECONDS, type CaptureResult } from './PcmRecorder.js';
import { pcmWav, qualityWarnings, type Recording } from '../data/dataset.js';
import { REQUESTED_PROCESSING } from './Microphone.js';
export interface RecorderPort { start(): { pre:Promise<{startFrame:number;sampleRate:number}>; done:Promise<CaptureResult> }; finish():void; cancel(message?:string):void; }
export interface PlaybackPort { play(onEnded:()=>void):{startedAt:number;duration:number}; stop():void; }
export async function captureDirection(options:{ recorder:RecorderPort; player:PlaybackPort; clock:{currentTime:number}; direction:number; settings:MediaTrackSettings; device:{deviceId:string;label:string;groupId?:string}; signal:string; abort:AbortSignal; phase:(phase:'preroll'|'playing'|'postroll')=>void }):Promise<Recording> {
  const {recorder,player,abort}=options;
  const cancel=()=>{player.stop();recorder.cancel('Capture interrupted. Incomplete recording discarded.');};
  abort.addEventListener('abort',cancel,{once:true});
  try {
    if(abort.aborted)throw new Error('Capture cancelled.');
    options.phase('preroll');
    const capture=recorder.start();
    void capture.pre.catch(()=>{}); void capture.done.catch(()=>{});
    const start=await capture.pre;
    if(abort.aborted)throw new Error('Capture cancelled.');
    const capturedAt=new Date(Date.now()-(options.clock.currentTime-start.startFrame/start.sampleRate)*1000).toISOString();
    let ended!:()=>void;
    const playbackEnded=new Promise<void>(resolve=>{ended=resolve;});
    options.phase('playing');
    const playback=player.play(ended);
    await Promise.race([playbackEnded,capture.done.then(()=>{throw new Error('Recording ended before playback.');})]);
    if(abort.aborted)throw new Error('Capture cancelled.');
    options.phase('postroll');recorder.finish();
    const result=await capture.done;
    if(abort.aborted)throw new Error('Capture cancelled.');
    const offset=playback.startedAt-result.startFrame/result.sampleRate;
    const duration=result.samples.length/result.sampleRate;
    if(!Number.isFinite(offset)||offset<PRE_ROLL_SECONDS-.002||duration-offset-playback.duration<POST_ROLL_SECONDS-.003)throw new Error('Captured audio did not cover the entire pre-roll, sweep and post-roll. Please replay.');
    const quality=qualityWarnings(result.samples,options.settings);
    return {direction:options.direction,sampleRate:result.sampleRate,channelCount:1,capturedAt,duration,frames:result.samples.length,microphone:options.device,processing:{requested:REQUESTED_PROCESSING,effective:{...options.settings}},signal:options.signal,timing:{preRollSeconds:PRE_ROLL_SECONDS,playbackOffsetSeconds:offset,playbackDurationSeconds:playback.duration,postRollSeconds:duration-offset-playback.duration,clock:'AudioContext',startFrame:result.startFrame},...quality,wav:pcmWav(result.samples,result.sampleRate)};
  } catch(error) {cancel();throw error;} finally {abort.removeEventListener('abort',cancel);}
}
