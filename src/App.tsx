import { useCamera } from './camera/useCamera';
export default function App() {
  const camera = useCamera();
  const labels = { requesting: 'Requesting camera access', ready: 'Camera ready', denied: 'Camera permission denied', unavailable: 'Camera unavailable' };
  return <main>
    <header><div className="eyebrow">RESEARCH PROTOTYPE <span>V0.2</span></div><h1>Personal Spatial Calibration</h1><p className="instruction">Position your phone so your upper body stays visible.</p></header>
    <section className="camera-area" aria-label="Camera preview">
      <div className="preview"><video ref={camera.videoRef} autoPlay muted playsInline className={camera.facing === 'user' && !camera.deviceId ? 'mirrored' : ''}/>{camera.status !== 'ready' && <div className="placeholder"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/></svg><h2>{labels[camera.status]}</h2><p>{camera.message}</p></div>}<div className="preview-label">{camera.status === 'ready' ? 'LIVE PREVIEW' : 'CAMERA PREVIEW'}</div></div>
      <div className="camera-toolbar"><div className={`status ${camera.status}`} role="status"><i/>{labels[camera.status]}</div><div className="controls">{camera.devices.length > 1 && <select aria-label="Choose camera" value={camera.deviceId} onChange={e => camera.selectDevice(e.target.value)}><option value="">Automatic camera</option>{camera.devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}</select>}<button className="secondary" onClick={camera.switchFacing} disabled={camera.status === 'requesting'}>Switch camera</button>{(camera.status === 'denied' || camera.status === 'unavailable') && <button className="secondary" onClick={camera.retry}>Try again</button>}</div></div>
    </section>
    <footer><div><h2>Camera setup</h2><p>{camera.status === 'ready' ? camera.message : 'Your camera preview stays in this browser. Nothing is recorded.'}</p><p className="scope">Pose tracking is the next stage. Calibration is not yet available.</p></div><button className="primary" disabled>Start Calibration <span aria-hidden="true">→</span></button></footer>
  </main>;
}
