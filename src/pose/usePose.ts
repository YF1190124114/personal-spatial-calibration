import { useEffect, useRef, useState, type RefObject } from 'react';
import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import { containRect, HIGHLIGHTS, NAMES, project, quality, summarize } from './poseMath';

type Tracking = { status: 'Initializing' | 'Person detected' | 'Tracking uncertain' | 'Person not detected' | 'Model error'; confidence: number | null; error?: string };
export function usePose(videoRef: RefObject<HTMLVideoElement | null>, active: boolean, mirrored: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tracking, setTracking] = useState<Tracking>({ status: 'Initializing', confidence: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false, model: PoseLandmarker | undefined, frame = 0;
    let points: NormalizedLandmark[] = [], lastVideoTime = -1, lastInference = -Infinity, lastReport = -Infinity;
    const canvas = canvasRef.current, video = videoRef.current;
    const context = canvas?.getContext('2d');
    setTracking({ status: 'Initializing', confidence: null });
    if (!canvas || !video || !context || !active) { context?.clearRect(0, 0, canvas?.width ?? 0, canvas?.height ?? 0); return; }
    function draw() {
      if (!canvas || !video || !context) return;
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      if (!video.videoWidth || !video.videoHeight) return;
      const rect = containRect(width, height, video.videoWidth, video.videoHeight);
      context.save(); context.beginPath(); context.rect(rect.x, rect.y, rect.width, rect.height); context.clip();
      for (const connection of PoseLandmarker.POSE_CONNECTIONS) {
        const a = points[connection.start], b = points[connection.end];
        if (!a || !b || quality(a) < 0.35 || quality(b) < 0.35) continue;
        const start = project(a, rect, mirrored), end = project(b, rect, mirrored);
        context.strokeStyle = '#d8e6d6'; context.lineWidth = 2; context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
      }
      points.forEach((point, index) => {
        if (quality(point) < 0.35) return;
        const p = project(point, rect, mirrored), highlighted = HIGHLIGHTS.some(i => i === index);
        context.beginPath(); context.arc(p.x, p.y, highlighted ? 5 : 2.5, 0, 2 * Math.PI); context.fillStyle = highlighted ? '#e8c780' : '#e4eee0'; context.fill(); context.strokeStyle = '#202420'; context.lineWidth = 1.5; context.stroke();
        if (highlighted) { const label = NAMES[index]; context.font = '11px sans-serif'; const w = context.measureText(label).width + 10; const x = Math.max(rect.x, Math.min(p.x + 8, rect.x + rect.width - w)); const y = Math.max(rect.y + 16, Math.min(p.y - 8, rect.y + rect.height - 5)); context.fillStyle = '#202420d9'; context.fillRect(x, y - 13, w, 17); context.fillStyle = '#f5e7c6'; context.fillText(label, x + 5, y); }
      });
      context.restore();
    }
    const observer = new ResizeObserver(draw); observer.observe(canvas);
    function fail() {
      if (disposed) return;
      points = []; draw(); model?.close(); model = undefined;
      setTracking({ status: 'Model error', confidence: null, error: 'Pose tracking could not start or continue. Check model assets and browser support, then retry. The camera remains available.' });
    }
    async function initialize() {
      try {
        const files = await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}mediapipe/wasm`);
        if (disposed) return;
        model = await PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: `${import.meta.env.BASE_URL}models/pose_landmarker_lite.task`, delegate: 'CPU' }, runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5, outputSegmentationMasks: false });
        if (disposed) { model.close(); model = undefined; return; }
        function tick(now: number) {
          if (disposed || !model) return;
          try {
            // Bound synchronous inference to at most 15 Hz; never reprocess a video frame.
            if (!document.hidden && video && video.readyState >= 2 && video.currentTime !== lastVideoTime && now - lastInference >= 1000 / 15) {
              lastVideoTime = video.currentTime; lastInference = now;
              points = model.detectForVideo(video, now).landmarks[0] ?? [];
              draw();
              if (now - lastReport >= 200) { setTracking(summarize(points)); lastReport = now; }
            }
            frame = requestAnimationFrame(tick);
          } catch { fail(); }
        }
        frame = requestAnimationFrame(tick);
      } catch { fail(); }
    }
    void initialize();
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); model?.close(); points = []; context.clearRect(0, 0, canvas.width, canvas.height); };
  }, [videoRef, active, mirrored, attempt]);
  return { canvasRef, tracking, retry: () => setAttempt(a => a + 1) };
}
