// Render-thread PCM capture. Outputs stay silent: microphone is never monitored to speakers.
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super(); this.session = null; this.monitorFrames = 0;
    this.port.onmessage = ({ data }) => {
      if (data.type === 'start') {
        if (this.session) return;
        this.session = { id: data.id, frames: 0, pre: Math.round(sampleRate * data.preSeconds), stopAt: Infinity, chunks: [], preSent: false, startFrame: null };
      }
      if (data.type === 'cancel') this.session = null;
      if (data.type === 'finish' && this.session?.id === data.id) this.session.stopAt = this.session.frames + Math.round(sampleRate * data.postSeconds);
    };
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    const s = this.session;
    if (!input?.length) {
      if (s) { this.port.postMessage({type:'error',id:s.id,error:'Microphone supplied no PCM input.'}); this.session = null; }
      return true;
    }
    this.monitorFrames += input.length;
    if (this.monitorFrames >= sampleRate / 10) {
      this.monitorFrames = 0; let sum = 0, peak = 0;
      for (const v of input) { sum += v*v; peak = Math.max(peak,Math.abs(v)); }
      const wave = Array.from({length:32},(_,i)=>input[Math.floor(i*input.length/32)]);
      this.port.postMessage({type:'level',rms:Math.sqrt(sum/input.length),peak,wave,frames:s?.frames ?? 0});
    }
    if (!s) return true;
    if (s.startFrame === null) s.startFrame = currentFrame;
    if (currentFrame !== s.startFrame + s.frames) { this.port.postMessage({type:'error',id:s.id,error:'Discontinuous PCM frames. Please replay.'}); this.session = null; return true; }
    const count = Math.min(input.length, s.stopAt - s.frames);
    s.chunks.push(input.slice(0,count)); s.frames += count;
    if (!s.preSent && s.frames >= s.pre) {
      s.preSent = true; this.port.postMessage({type:'preroll',id:s.id,startFrame:s.startFrame,sampleRate,frames:s.frames});
    }
    if (s.frames >= s.stopAt) {
      const samples = new Float32Array(s.frames); let offset = 0;
      for (const chunk of s.chunks) { samples.set(chunk,offset); offset += chunk.length; }
      this.port.postMessage({type:'complete',id:s.id,startFrame:s.startFrame,sampleRate,samples},[samples.buffer]); this.session = null;
    } else if (s.frames > sampleRate * 15) {
      this.port.postMessage({type:'error',id:s.id,error:'Recording exceeded the 15-second capture limit.'}); this.session = null;
    }
    return true;
  }
}
registerProcessor('pcm-capture', PcmCapture);
