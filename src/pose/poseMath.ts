export const HIGHLIGHTS = [0, 7, 8, 11, 12] as const;
export const NAMES: Record<number, string> = { 0: 'Nose', 7: 'Left ear', 8: 'Right ear', 11: 'Left shoulder', 12: 'Right shoulder' };
export type Landmark = { x: number; y: number; visibility?: number; presence?: number };
export function quality(point?: Landmark): number {
  if (!point) return 0;
  const values = [point.visibility, point.presence].filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return values.length ? Math.max(0, Math.min(1, ...values)) : 0;
}
export function summarize(points: Landmark[] = []) {
  if (!points.length) return { status: 'Person not detected' as const, confidence: null };
  const scores = HIGHLIGHTS.map(index => quality(points[index]));
  const confidence = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return { status: scores.every(score => score >= 0.5) ? 'Person detected' as const : 'Tracking uncertain' as const, confidence };
}
// Matches object-fit: contain, centered, without cropping the camera image.
export function containRect(width: number, height: number, videoWidth: number, videoHeight: number) {
  const scale = Math.min(width / videoWidth, height / videoHeight);
  const w = videoWidth * scale, h = videoHeight * scale;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}
export function project(point: Landmark, rect: ReturnType<typeof containRect>, mirrored: boolean) {
  return { x: rect.x + (mirrored ? 1 - point.x : point.x) * rect.width, y: rect.y + point.y * rect.height };
}
