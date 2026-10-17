export const ANGLES = [0,45,90,135,180,225,270,315] as const;
export type Recording = {
  direction: number; sampleRate: number; channelCount: 1; capturedAt: string; duration: number; frames: number;
  microphone: { deviceId: string; label: string; groupId?: string };
  processing: { requested: Record<string,boolean>; effective: MediaTrackSettings };
  signal: string; timing: { preRollSeconds: number; playbackOffsetSeconds: number; playbackDurationSeconds: number; postRollSeconds: number; clock: 'AudioContext'; startFrame: number };
  warnings: string[]; rms: number; peak: number; wav: Uint8Array;
};
export function pcmWav(samples: Float32Array, sampleRate: number): Uint8Array {
  if (!Number.isInteger(sampleRate) || sampleRate <= 0 || !samples.length) throw new Error('Invalid PCM sample rate or empty capture.');
  const bytes = new Uint8Array(44 + samples.length*2), v = new DataView(bytes.buffer);
  const text = (offset:number,s:string) => [...s].forEach((c,i)=>v.setUint8(offset+i,c.charCodeAt(0)));
  text(0,'RIFF');v.setUint32(4,bytes.length-8,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,samples.length*2,true);
  samples.forEach((sample,i)=>{if(!Number.isFinite(sample)) throw new Error('Non-finite PCM sample.');const s=Math.max(-1,Math.min(1,sample));v.setInt16(44+i*2,Math.round(s*(s<0?32768:32767)),true);});return bytes;
}
export function qualityWarnings(samples:Float32Array, settings:MediaTrackSettings) {
  let sum=0,peak=0;for(const s of samples){sum+=s*s;peak=Math.max(peak,Math.abs(s));}const rms=Math.sqrt(sum/samples.length), warnings:string[]=[];
  if(peak>=.99)warnings.push('Possible clipping. Reduce device volume or microphone gain and replay.');
  if(rms<.001)warnings.push('Very low or silent recording. Check microphone and speaker routing.');
  for(const key of ['echoCancellation','noiseSuppression','autoGainControl'] as const) if(settings[key]!==false)warnings.push(`${key}: ${settings[key]===undefined?'not reported by browser':'enabled despite disable request'}.`);
  return {rms,peak,warnings};
}
export function filename(angle:number){return `${String(angle).padStart(3,'0')}deg.wav`;}
export function validRecording(r:Recording) {
  if(!Number.isInteger(r.sampleRate)||r.sampleRate<=0||!Number.isInteger(r.frames)||r.frames<=0||r.wav.length!==44+r.frames*2||r.channelCount!==1||Math.abs(r.duration-r.frames/r.sampleRate)>1e-6)return false;
  const v=new DataView(r.wav.buffer,r.wav.byteOffset,r.wav.byteLength);
  return v.getUint32(0,false)===0x52494646&&v.getUint32(8,false)===0x57415645&&v.getUint16(20,true)===1&&v.getUint16(22,true)===1&&v.getUint32(24,true)===r.sampleRate&&v.getUint16(34,true)===16&&v.getUint32(40,true)===r.frames*2;
}
export function fullDataset(records:Recording[]) {return records.length===8 && ANGLES.every(a=>records.filter(r=>r.direction===a&&validRecording(r)).length===1);}
export function datasetEntries(records:Recording[],session:Record<string,unknown>) {
  if(!fullDataset(records))throw new Error('All eight direction recordings are required.');
  const sorted=ANGLES.map(a=>records.find(r=>r.direction===a)!);
  const metadata={schemaVersion:'0.6',...session,exportedAt:new Date().toISOString(),purpose:'Software acoustic capture prototype; no orientation validation, HRTF or pinna-response claim.',recordings:sorted.map(({wav,...record})=>({...record,file:filename(record.direction),encoding:'PCM16 WAV little-endian',bytes:wav.length}))};
  return [{name:'metadata.json',data:new TextEncoder().encode(JSON.stringify(metadata,null,2))},...sorted.map(r=>({name:filename(r.direction),data:r.wav}))];
}
// ZIP STORE (no compression), UTF-8 names and CRC32. No third-party dependency.
export function crc32(bytes:Uint8Array) {let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function zipStore(entries:{name:string;data:Uint8Array}[]) {
  const local:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0,centralSize=0;
  for(const entry of entries){const name=new TextEncoder().encode(entry.name),crc=crc32(entry.data),header=new Uint8Array(30+name.length),h=new DataView(header.buffer);h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x800,true);h.setUint16(12,33,true);h.setUint32(14,crc,true);h.setUint32(18,entry.data.length,true);h.setUint32(22,entry.data.length,true);h.setUint16(26,name.length,true);header.set(name,30);
    const directory=new Uint8Array(46+name.length),d=new DataView(directory.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(14,33,true);d.setUint32(16,crc,true);d.setUint32(20,entry.data.length,true);d.setUint32(24,entry.data.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);directory.set(name,46);local.push(header,entry.data);central.push(directory);offset+=header.length+entry.data.length;centralSize+=directory.length;
  }
  const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
  const output=new Uint8Array(offset+centralSize+22);let cursor=0;for(const part of [...local,...central,end]){output.set(part,cursor);cursor+=part.length;}return output;
}
