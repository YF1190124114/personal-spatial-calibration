import { useEffect, useRef, useState } from 'react';

type Status = 'requesting' | 'ready' | 'denied' | 'unavailable';
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>('requesting');
  const [message, setMessage] = useState('Allow camera access in your browser to see the live preview.');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState('');
  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | undefined;
    const stop = () => stream?.getTracks().forEach(track => track.stop());
    setStatus('requesting');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      setMessage('Camera access requires HTTPS or localhost and a supported browser.');
      return;
    }
    async function open() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: facing } }), width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (cancelled) { stop(); return; }
        const video = videoRef.current;
        if (video) { video.srcObject = stream; await video.play(); }
        if (cancelled) { stop(); return; }
        setStatus('ready');
        setMessage('Keep your head, shoulders and upper body in view.');
        try { const all = await navigator.mediaDevices.enumerateDevices(); if (!cancelled) setDevices(all.filter(d => d.kind === 'videoinput')); } catch { /* Preview remains usable without enumeration. */ }
        stream.getVideoTracks().forEach(track => track.addEventListener('ended', () => { if (!cancelled) { setStatus('unavailable'); setMessage('The camera disconnected. Reconnect it and try again.'); } }));
      } catch (error) {
        stop();
        if (cancelled) return;
        const name = error instanceof DOMException ? error.name : '';
        setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
        setMessage(name === 'NotAllowedError' || name === 'SecurityError' ? 'Allow camera access in your browser’s site settings, then try again.' : name === 'NotReadableError' ? 'Your camera may be in use by another app. Close it and try again.' : name === 'NotFoundError' ? 'No camera was found. Connect a camera and try again.' : 'The selected camera could not start. Choose another camera or try again.');
      }
    }
    void open();
    return () => { cancelled = true; stop(); };
  }, [facing, deviceId, attempt]);
  return { videoRef, status, message, devices, deviceId, facing, selectDevice: setDeviceId, switchFacing: () => { setDeviceId(''); setFacing(f => f === 'user' ? 'environment' : 'user'); }, retry: () => setAttempt(a => a + 1) };
}
