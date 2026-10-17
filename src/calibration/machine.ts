export const DIRECTIONS = [0,45,90,135,180,225,270,315] as const;
export type Phase = 'idle'|'preparation'|'rotate'|'countdown'|'recordingPrepare'|'preroll'|'playing'|'postroll'|'feedback'|'complete';
export const CAPTURE_PHASES:Phase[]=['recordingPrepare','preroll','playing','postroll'];
export type State={phase:Phase;step:number;completed:number;count:number;paused:boolean};
export type Event={type:'START'|'READY'|'CONFIRM'|'TICK'|'NEXT'|'PAUSE'|'RESUME'|'PREVIOUS'|'RESTART'|'EXIT'|'CAPTURE_STARTED'|'PRE_ROLL_READY'|'AUDIO_ENDED'|'AUDIO_FAILED'|'RECORDING_COMPLETE'};
export const initialState:State={phase:'idle',step:0,completed:0,count:3,paused:false};
export function calibrationReducer(state:State,event:Event):State {
  if(event.type==='EXIT')return {...initialState};
  if((event.type==='START'&&state.phase==='idle')||(event.type==='RESTART'&&state.phase!=='idle'))return {...initialState,phase:'preparation'};
  if(event.type==='PAUSE'&&!['idle','complete'].includes(state.phase))return {...state,paused:true,...(CAPTURE_PHASES.includes(state.phase)?{phase:'rotate' as const,count:3}:{})};
  if(event.type==='RESUME')return {...state,paused:false};
  if(state.paused)return state;
  if(event.type==='PREVIOUS'&&state.step>0&&!['idle','preparation'].includes(state.phase)){const step=state.phase==='complete'?7:state.step-1;return {...state,phase:'rotate',step,completed:step,count:3};}
  if(event.type==='READY'&&state.phase==='preparation')return {...state,phase:'rotate'};
  if(event.type==='CONFIRM'&&state.phase==='rotate')return {...state,phase:'countdown',count:3};
  if(event.type==='TICK'&&state.phase==='countdown')return state.count>1?{...state,count:state.count-1}:{...state,phase:'recordingPrepare',count:0};
  if(event.type==='CAPTURE_STARTED'&&state.phase==='recordingPrepare')return {...state,phase:'preroll'};
  if(event.type==='PRE_ROLL_READY'&&state.phase==='preroll')return {...state,phase:'playing'};
  if(event.type==='AUDIO_ENDED'&&state.phase==='playing')return {...state,phase:'postroll'};
  if(event.type==='RECORDING_COMPLETE'&&state.phase==='postroll')return {...state,phase:'feedback',completed:state.step+1};
  if(event.type==='AUDIO_FAILED'&&CAPTURE_PHASES.includes(state.phase))return {...state,phase:'rotate',count:3};
  if(event.type==='NEXT'&&state.phase==='feedback')return state.step===7?{...state,phase:'complete'}:{...state,phase:'rotate',step:state.step+1,count:3};
  return state;
}
export interface OrientationObservation{timestamp:number;status:'unavailable'|'uncertain'|'valid'}
export interface OrientationSource{subscribe(listener:(observation:OrientationObservation)=>void):()=>void}
