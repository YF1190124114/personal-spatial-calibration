import type { MicState } from './Microphone';
import type { Monitor } from './PcmRecorder';
export function MicrophonePanel({mic,ready,monitor,locked,busy,connect,disconnect,recording,stage}:{mic:MicState;ready:boolean;monitor:Monitor;locked:boolean;busy:boolean;connect:(id?:string)=>void;disconnect:()=>void;recording:boolean;stage:string}){
  const wave=monitor.wave.map((value,i)=>`${i*300/Math.max(1,monitor.wave.length-1)},${30-value*28}`).join(' ');
  return <section className="microphone-panel" aria-label="Microphone setup"><div className="flow-heading"><div><p className="eyebrow">MICROPHONE SETUP</p><h2>Capture the sweep</h2></div><span className="prototype-note">Local PCM recording</span></div>
    <p className="flow-disclaimer">Built-in microphones are for software pipeline testing. These recordings do not establish your pinna response or HRTF. No audio is uploaded.</p>
    <div className="mic-controls"><button className="secondary" disabled={locked||busy||mic.status==='connecting'} onClick={()=>connect(mic.devices.some(d=>d.deviceId===mic.selected)?mic.selected:'')}>{mic.status==='connected'?'Reconnect microphone':'Enable microphone'}</button><select aria-label="Select microphone" value={mic.selected} disabled={locked||busy||mic.status==='connecting'||mic.permission!=='granted'} onChange={e=>connect(e.target.value)}><option value="">System default microphone</option>{mic.devices.map((d,i)=><option key={d.deviceId||i} value={d.deviceId}>{d.label||`Microphone ${i+1}`}</option>)}</select><button className="secondary" disabled={mic.status!=='connected'} onClick={disconnect}>Disconnect microphone</button></div>
    <div className="mic-details" role="status"><span>Selected: {mic.label||'None'}</span><span>Connection: {mic.status}{mic.status==='connected'&&!ready?' · PCM setup pending':''}</span><span>Permission (last request): {mic.permission}</span><span>PCM pipeline: {ready?'Ready':'Not ready'}</span><span>Recording status: {recording?stage:'Idle — live level monitoring only'}</span></div>
    {mic.error&&<p className="pose-error" role="alert">{mic.error}</p>}
    <p className="scope">When enabled, the microphone stays active for level monitoring. Only capture stages store samples. Disconnect stops microphone access.</p>
    <label className="mic-level">Input level <meter min="0" max="1" value={Math.min(1,monitor.rms*4)} aria-label="Microphone input RMS level"/> <span>{(20*Math.log10(Math.max(monitor.rms,1e-6))).toFixed(0)} dBFS</span></label>
    <svg className="mic-wave" viewBox="0 0 300 60" role="img" aria-label="Live microphone waveform"><line x1="0" x2="300" y1="30" y2="30"/>{wave&&<polyline points={wave}/>}</svg>
    <p className="scope">Requested: echo cancellation off · noise suppression off · automatic gain off. Effective: {(['echoCancellation','noiseSuppression','autoGainControl'] as const).map(k=>`${k}: ${mic.settings[k]===undefined?'not reported':mic.settings[k]?'on':'off'}`).join(' · ')}</p>
    {monitor.peak>=.99&&<p className="pose-error">Input may be clipping. Reduce device volume or microphone gain.</p>}
  </section>;
}
