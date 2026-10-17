/** One decoded asset and one active source per player. No microphone access. */
export const PLAYBACK_GAIN = 0.5;
export const ESS_ASSET = 'audio/ess-200-8000-3s.wav';
export class EssPlayer {
  private context?: AudioContext;
  private buffer?: AudioBuffer;
  private loading?: Promise<AudioBuffer>;
  private source?: AudioBufferSourceNode;
  private gain?: GainNode;
  private startedAt = 0;
  private generation = 0;
  onInterrupted?: () => void;
  constructor(private readonly url: string, private readonly createContext = () => new AudioContext(), private readonly fetchAsset: typeof fetch = (...args) => fetch(...args)) {}
  private getContext() {
    if (!this.context || this.context.state === 'closed') {
      const context = this.createContext();
      context.onstatechange = () => { if (context.state !== 'running' && this.source) { this.stop(); this.onInterrupted?.(); } };
      this.context = context;
    }
    return this.context;
  }
  /** Invoke directly in a click handler so resume is tied to a user gesture. */
  async prepare(): Promise<void> {
    const context = this.getContext();
    const resume = context.state === 'running' ? Promise.resolve() : context.resume();
    if (!this.buffer && !this.loading) {
      this.loading = this.fetchAsset(this.url).then(response => {
        if (!response.ok) throw new Error('Could not load the calibration sound.');
        return response.arrayBuffer();
      }).then(data => context.decodeAudioData(data)).then(buffer => {
        if (!Number.isFinite(buffer.duration) || Math.abs(buffer.duration - 3) > 0.05) throw new Error('The calibration sound must be three seconds long.');
        this.buffer = buffer;
        return buffer;
      }).catch(error => { this.loading = undefined; throw error; });
    }
    await Promise.all([resume, this.buffer ? Promise.resolve(this.buffer) : this.loading]);
    if (context.state !== 'running') throw new Error('Audio is suspended. Tap again to enable sound.');
  }
  play(onEnded: () => void) {
    this.stop();
    const context = this.context;
    if (!context || context.state !== 'running' || !this.buffer) throw new Error('Audio is not ready. Tap Retry sound to enable playback.');
    const generation = this.generation;
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = this.buffer;
    gain.gain.value = PLAYBACK_GAIN;
    source.connect(gain); gain.connect(context.destination);
    source.onended = () => {
      if (generation !== this.generation || this.source !== source) return;
      this.source = undefined; this.gain = undefined;
      source.disconnect(); gain.disconnect(); onEnded();
    };
    this.source = source; this.gain = gain; this.startedAt = context.currentTime;
    try { source.start(); } catch (error) { this.stop(); throw error; }
  }
  get remaining() { return this.source && this.context && this.buffer ? Math.max(0, this.buffer.duration - (this.context.currentTime - this.startedAt)) : 3; }
  stop() {
    this.generation++;
    const source = this.source; this.source = undefined;
    if (source) { source.onended = null; try { source.stop(); } catch { /* Already ended. */ } source.disconnect(); }
    this.gain?.disconnect(); this.gain = undefined;
  }
  dispose() { this.stop(); if (this.context) { this.context.onstatechange = null; void this.context.close().catch(() => {}); this.context = undefined; } }
}
