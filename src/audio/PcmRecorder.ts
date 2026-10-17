export const PRE_ROLL_SECONDS = 0.25, POST_ROLL_SECONDS = 0.25;
export type CaptureResult = { samples: Float32Array; sampleRate: number; startFrame: number };
export type Monitor = { rms: number; peak: number; wave: number[]; frames: number };
export class PcmRecorder {
  private node?: AudioWorkletNode;
  private source?: MediaStreamAudioSourceNode;
  private stream?: MediaStream;
  private loading?: Promise<void>;
  private attachVersion = 0;
  private serial = 0;
  private current?: { id: number; preResolve: (value: {startFrame:number;sampleRate:number}) => void; doneResolve: (value:CaptureResult)=>void; reject: (error:Error)=>void; preReject:(error:Error)=>void; timeout: ReturnType<typeof setTimeout> };
  onMonitor?: (value: Monitor) => void;
  onFailure?: () => void;
  constructor(readonly context: AudioContext, private url: string, private timeoutMs = 18000) {}
  async attach(stream: MediaStream) {
    if (!this.context.audioWorklet || typeof AudioWorkletNode === 'undefined') throw new Error('AudioWorklet is required for raw PCM capture. Use a supported browser on HTTPS or localhost.');
    const version = ++this.attachVersion;
    if (!this.loading) this.loading = this.context.audioWorklet.addModule(this.url).catch(error => {this.loading = undefined; throw error;});
    await this.loading;
    if (version !== this.attachVersion) return;
    if (!stream.getAudioTracks().some(track => track.readyState === 'live')) throw new Error('Microphone disconnected during setup.');
    if (this.stream === stream && this.node) return;
    this.detach();
    const source = this.context.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(this.context, 'pcm-capture', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount:[1], channelCount:1, channelCountMode:'explicit' });
    node.port.onmessage = ({data}) => {
      if (data.type === 'level') { this.onMonitor?.(data); return; }
      const capture = this.current;
      if (!capture || capture.id !== data.id) return;
      if (data.type === 'preroll') capture.preResolve(data);
      if (data.type === 'complete') { clearTimeout(capture.timeout); this.current = undefined; capture.doneResolve(data); }
      if (data.type === 'error') { this.cancel(data.error); this.onFailure?.(); }
    };
    node.onprocessorerror = () => { this.cancel('AudioWorklet failed. Reconnect the microphone.'); this.onFailure?.(); };
    source.connect(node); node.connect(this.context.destination);
    this.source = source; this.node = node; this.stream = stream;
  }
  start() {
    if (this.current) throw new Error('A recording is already active.');
    if (!this.node || this.context.state !== 'running' || !this.stream?.getAudioTracks().some(t => t.readyState === 'live' && !t.muted)) throw new Error('Microphone or audio context is not ready.');
    let preResolve!: (value:{startFrame:number;sampleRate:number})=>void, preReject!: (error:Error)=>void;
    let doneResolve!: (value:CaptureResult)=>void, reject!: (error:Error)=>void;
    const pre = new Promise<{startFrame:number;sampleRate:number}>((res,rej)=>{preResolve=res;preReject=rej;});
    const done = new Promise<CaptureResult>((res,rej)=>{doneResolve=res;reject=rej;});
    // Attach rejection handlers immediately; callers await pre-roll before awaiting completion.
    void pre.catch(()=>{}); void done.catch(()=>{});
    const id = ++this.serial;
    this.current = {id,preResolve,preReject,doneResolve,reject,timeout:setTimeout(()=>{this.cancel('Recording timed out. Incomplete audio discarded.');this.onFailure?.();},this.timeoutMs)};
    this.node.port.postMessage({type:'start',id,preSeconds:PRE_ROLL_SECONDS});
    return {pre,done};
  }
  finish() { if (!this.current) throw new Error('No recording is active.'); this.node?.port.postMessage({type:'finish',id:this.current.id,postSeconds:POST_ROLL_SECONDS}); }
  cancel(message = 'Recording cancelled.') {
    this.node?.port.postMessage({type:'cancel'});
    const current = this.current; this.current = undefined;
    if (current) { clearTimeout(current.timeout); const error = new Error(message); current.preReject(error); current.reject(error); }
  }
  detach() { this.attachVersion++; this.cancel(); if (this.node) { this.node.port.onmessage = null; this.node.onprocessorerror = null; this.node.disconnect(); this.node.port.close(); } this.source?.disconnect(); this.node = undefined; this.source = undefined; this.stream = undefined; }
}
