export const REQUESTED_PROCESSING = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
export type MicState = { status: 'not-enabled' | 'connecting' | 'connected' | 'denied' | 'unavailable'; permission: string; devices: MediaDeviceInfo[]; selected: string; label: string; settings: MediaTrackSettings; error?: string };
export class Microphone {
  state: MicState = { status: 'not-enabled', permission: 'not requested', devices: [], selected: '', label: '', settings: {} };
  stream?: MediaStream;
  onChange?: (state: MicState) => void;
  onLoss?: () => void;
  private version = 0;
  constructor(private media?: MediaDevices) {}
  private update(patch: Partial<MicState>) { this.state = { ...this.state, ...patch }; this.onChange?.(this.state); }
  async refresh() {
    try {
      const devices = (await this.media?.enumerateDevices() ?? []).filter(d => d.kind === 'audioinput');
      this.update({ devices });
      const id = this.stream?.getAudioTracks()[0]?.getSettings().deviceId;
      if (id && !devices.some(device => device.deviceId === id)) this.lost('Selected microphone was removed. Connect and enable a microphone again.');
    } catch { this.update({ error: 'Microphone discovery failed. Check browser permissions.' }); }
  }
  private stopTracks() { this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined; }
  private lost(error: string) { this.version++; this.stopTracks(); this.update({ status: 'unavailable', error }); this.onLoss?.(); }
  async connect(deviceId = '') {
    const version = ++this.version;
    if (this.stream) this.onLoss?.(); this.stopTracks();
    this.update({ status: 'connecting', error: undefined });
    try {
      if (!this.media?.getUserMedia) throw new Error('Microphone capture requires HTTPS or localhost and browser support.');
      const stream = await this.media.getUserMedia({ video: false, audio: { ...REQUESTED_PROCESSING, channelCount: { ideal: 1 }, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) } });
      if (version !== this.version) { stream.getTracks().forEach(t => t.stop()); return; }
      const track = stream.getAudioTracks()[0];
      if (!track || track.readyState !== 'live') { stream.getTracks().forEach(t => t.stop()); throw new Error('Microphone did not provide a live audio track.'); }
      this.stream = stream;
      track.addEventListener('ended', () => { if (this.stream === stream) this.lost('Microphone disconnected or access was revoked. Incomplete recording discarded.'); });
      track.addEventListener('mute', () => { if (this.stream === stream) this.lost('Microphone input was interrupted. Enable it again to retry.'); });
      const settings = track.getSettings();
      this.update({ status: 'connected', permission: 'granted', selected: settings.deviceId ?? deviceId, label: track.label || 'Microphone', settings });
      await this.refresh();
    } catch (error) {
      if (version !== this.version) return;
      const denied = error instanceof DOMException && ['NotAllowedError', 'SecurityError'].includes(error.name);
      this.update({ status: denied ? 'denied' : 'unavailable', permission: denied ? 'denied' : this.state.permission, error: denied ? 'Microphone permission denied. Allow it in browser site settings, then enable again.' : error instanceof Error ? error.message : 'Microphone could not start.' });
    }
  }
  disconnect() { this.version++; this.stopTracks(); this.update({ status: 'not-enabled' }); this.onLoss?.(); }
  dispose() { this.version++; this.stopTracks(); }
}
