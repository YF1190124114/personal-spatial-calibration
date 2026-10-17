import { useCallback,useEffect,useReducer,useRef,useState } from 'react';
import { calibrationReducer,initialState,CAPTURE_PHASES,type Event,DIRECTIONS } from './machine';
import { ESS_ASSET,EssPlayer,PLAYBACK_GAIN } from '../audio/EssPlayer';
import { Microphone } from '../audio/Microphone';
import { PcmRecorder,type Monitor } from '../audio/PcmRecorder';
import { captureDirection } from '../audio/captureDirection';
import { datasetEntries,fullDataset,zipStore,type Recording } from '../data/dataset';
const newSession=()=>({id:crypto.randomUUID(),startedAt:new Date().toISOString(),appVersion:'0.6.0',signal:ESS_ASSET,signalDefinition:{method:'logarithmic sine sweep',startHz:200,endHz:8000,durationSeconds:3,sampleRate:48000,fadeSeconds:0.02,peakAmplitude:0.2},playbackGain:PLAYBACK_GAIN,userAgent:navigator.userAgent});
export function useCalibration(){
  const [state,send]=useReducer(calibrationReducer,initialState);
  const [player]=useState(()=>new EssPlayer(`${import.meta.env.BASE_URL}${ESS_ASSET}`));
  const [mic]=useState(()=>new Microphone(navigator.mediaDevices));
  const [microphone,setMicrophone]=useState(mic.state);
  const [micReady,setMicReady]=useState(false);
  const recorder=useRef<PcmRecorder | undefined>(undefined);
  const [monitor,setMonitor]=useState<Monitor>({rms:0,peak:0,wave:[],frames:0});
  const [records,setRecords]=useState<Recording[]>([]);
  const [session,setSession]=useState(newSession);
  const [audio,setAudio]=useState<{busy:boolean;error?:string;remaining:number}>({busy:false,remaining:3});
  const operation=useRef(0),connection=useRef(0),abort=useRef<AbortController | undefined>(undefined);
  const stop=useCallback(()=>{operation.current++;abort.current?.abort();player.stop();recorder.current?.cancel();},[player]);
  const connectMicrophone=useCallback(async(deviceId='')=>{
    const id=++connection.current;stop();send({type:'PAUSE'});setMicReady(false);recorder.current?.detach();
    setAudio({busy:true,remaining:3});
    try{
      // Both audio contexts are the same; resume is initiated in this user click.
      await Promise.all([player.prepare(),mic.connect(deviceId)]);
      if(id!==connection.current)return;
      if(!mic.stream||mic.state.status!=='connected')throw new Error(mic.state.error??'Microphone is not connected.');
      const context=player.audioContext!;
      if(!recorder.current||recorder.current.context!==context)recorder.current=new PcmRecorder(context,`${import.meta.env.BASE_URL}worklets/pcm-capture.js`);
      recorder.current.onMonitor=setMonitor;
      recorder.current.onFailure=()=>{stop();send({type:'PAUSE'});setMicReady(false);setAudio({busy:false,remaining:3,error:'PCM capture was interrupted. Reconnect the microphone and replay this direction.'});};
      await recorder.current.attach(mic.stream);
      if(id!==connection.current)return;
      setMicReady(true);setAudio({busy:false,remaining:3});
    }catch(error){if(id===connection.current){if(['connecting','connected'].includes(mic.state.status))mic.disconnect();recorder.current?.detach();setAudio({busy:false,remaining:3,error:error instanceof Error?error.message:'Microphone setup failed.'});}}
  },[player,mic,stop]);
  const dispatch=useCallback((event:Event)=>{
    if(['PAUSE','PREVIOUS','RESTART','EXIT'].includes(event.type)){stop();setAudio({busy:false,remaining:3});}
    if(['RESTART','EXIT','START'].includes(event.type)){setRecords([]);setSession(newSession());}
    if(event.type==='PREVIOUS'){const target=state.phase==='complete'?7:Math.max(0,state.step-1);setRecords(old=>old.filter(r=>r.direction<DIRECTIONS[target]));}
    if(['READY','CONFIRM','RESUME'].includes(event.type)){
      if(!micReady||mic.state.status!=='connected'){setAudio({busy:false,remaining:3,error:'Enable a microphone before continuing.'});return;}
      const id=++operation.current;setAudio({busy:true,remaining:3});
      void player.prepare().then(()=>{if(id===operation.current){setAudio({busy:false,remaining:3});send(event);}}).catch(()=>{if(id===operation.current)setAudio({busy:false,remaining:3,error:'Sound could not be enabled. Check permissions and retry.'});});return;
    }
    send(event);
  },[state.phase,state.step,micReady,mic,player,stop]);
  useEffect(()=>{
    if(state.phase!=='countdown'||state.paused)return;
    const timer=setTimeout(()=>send({type:'TICK'}),1000);return()=>clearTimeout(timer);
  },[state.phase,state.count,state.paused]);
  const capturing=CAPTURE_PHASES.includes(state.phase);
  useEffect(()=>{
    if(!capturing||state.paused)return;
    const controller=new AbortController();abort.current=controller;let current=true;
    const context=player.audioContext;
    if(!context||!recorder.current||!mic.stream){send({type:'AUDIO_FAILED'});setAudio({busy:false,remaining:3,error:'Recording pipeline is not ready. Enable the microphone.'});return;}
    const settings=mic.stream.getAudioTracks()[0].getSettings();
    void captureDirection({recorder:recorder.current,player,clock:context,direction:DIRECTIONS[state.step],settings,device:{deviceId:settings.deviceId??microphone.selected,label:microphone.label,groupId:settings.groupId},signal:ESS_ASSET,abort:controller.signal,phase:phase=>{
      if(!current||controller.signal.aborted)return;
      send({type:phase==='preroll'?'CAPTURE_STARTED':phase==='playing'?'PRE_ROLL_READY':'AUDIO_ENDED'});
    }}).then(record=>{
      if(!current||controller.signal.aborted)return;
      setRecords(old=>[...old.filter(r=>r.direction!==record.direction),record]);send({type:'RECORDING_COMPLETE'});
    }).catch(error=>{
      if(!current||controller.signal.aborted)return;
      setAudio({busy:false,remaining:3,error:error instanceof Error?error.message:'Recording failed.'});send({type:'AUDIO_FAILED'});
    });
    const timer=setInterval(()=>{if(current)setAudio({busy:false,remaining:player.remaining});},100);
    return()=>{current=false;clearInterval(timer);controller.abort();};
    // The boolean keeps the same capture alive across prepare/pre-roll/play/post-roll transitions.
  },[capturing,state.step,state.paused,player,mic]);
  useEffect(()=>{
    const loss=()=>{stop();send({type:'PAUSE'});setMicReady(false);recorder.current?.detach();setMonitor({rms:0,peak:0,wave:[],frames:0});};
    mic.onChange=setMicrophone;mic.onLoss=loss;
    const changed=()=>{void mic.refresh();};navigator.mediaDevices?.addEventListener('devicechange',changed);void mic.refresh();
    const interrupt=()=>{stop();send({type:'PAUSE'});};
    player.onInterrupted=interrupt;
    const contextWatch=setInterval(()=>{if(abort.current&&!abort.current.signal.aborted&&player.audioContext?.state!=='running')interrupt();},200);
    const hide=()=>{if(document.hidden)interrupt();};document.addEventListener('visibilitychange',hide);
    return()=>{connection.current++;stop();clearInterval(contextWatch);navigator.mediaDevices?.removeEventListener('devicechange',changed);document.removeEventListener('visibilitychange',hide);mic.onChange=undefined;mic.onLoss=undefined;mic.dispose();recorder.current?.detach();recorder.current=undefined;player.onInterrupted=undefined;player.dispose();};
  },[mic,player,stop]);
  const exportDataset=()=>{
    try{const bytes=zipStore(datasetEntries(records,{...session,sessionStorage:'memory-only',captureMode:'AudioWorklet mono PCM, no microphone monitoring',sampleRateNote:'WAV rate is AudioContext rendering rate; effective track rate is separately reported.'}));const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/zip'}));const a=document.createElement('a');a.href=url;a.download=`spatial-calibration-${session.id}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}catch(error){setAudio({busy:false,remaining:3,error:error instanceof Error?error.message:'Export failed.'});}
  };
  return{state,dispatch,audio,microphone,micReady,connectMicrophone,monitor,records,canExport:fullDataset(records),exportDataset,recording:capturing,captureRate:player.audioContext?.sampleRate,lastRecord:records.find(r=>r.direction===DIRECTIONS[state.step]),disconnectMicrophone:()=>{connection.current++;mic.disconnect();}};
}
