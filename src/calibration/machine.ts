export const DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315] as const;
export type Phase = 'idle' | 'preparation' | 'rotate' | 'countdown' | 'playing' | 'feedback' | 'complete';
export type State = { phase: Phase; step: number; completed: number; count: number; paused: boolean };
export type Event = { type: 'START' | 'READY' | 'CONFIRM' | 'TICK' | 'NEXT' | 'PAUSE' | 'RESUME' | 'PREVIOUS' | 'RESTART' | 'EXIT' | 'AUDIO_ENDED' | 'AUDIO_FAILED' };
export const initialState: State = { phase: 'idle', step: 0, completed: 0, count: 3, paused: false };
export function calibrationReducer(state: State, event: Event): State {
  if (event.type === 'EXIT') return { ...initialState };
  if ((event.type === 'START' && state.phase === 'idle') || (event.type === 'RESTART' && state.phase !== 'idle')) return { ...initialState, phase: 'preparation' };
  if (event.type === 'PAUSE' && ['preparation', 'rotate', 'countdown', 'playing', 'feedback'].includes(state.phase)) return { ...state, paused: true, ...(state.phase === 'playing' ? { phase: 'rotate' as const, count: 3 } : {}) };
  if (event.type === 'RESUME') return { ...state, paused: false };
  if (state.paused) return state;
  if (event.type === 'PREVIOUS' && state.step > 0 && ['rotate', 'countdown', 'playing', 'feedback', 'complete'].includes(state.phase)) {
    const step = state.phase === 'complete' ? 7 : state.step - 1;
    return { ...state, phase: 'rotate', step, completed: step, count: 3 };
  }
  if (event.type === 'READY' && state.phase === 'preparation') return { ...state, phase: 'rotate' };
  if (event.type === 'CONFIRM' && state.phase === 'rotate') return { ...state, phase: 'countdown', count: 3 };
  if (event.type === 'TICK' && state.phase === 'countdown') return state.count > 1 ? { ...state, count: state.count - 1 } : { ...state, phase: 'playing', count: 0 };
  if (event.type === 'AUDIO_ENDED' && state.phase === 'playing') return { ...state, phase: 'feedback', completed: state.step + 1 };
  if (event.type === 'AUDIO_FAILED' && state.phase === 'playing') return { ...state, phase: 'rotate', count: 3 };
  if (event.type === 'NEXT' && state.phase === 'feedback') return state.step === 7 ? { ...state, phase: 'complete' } : { ...state, phase: 'rotate', step: state.step + 1, count: 3 };
  return state;
}
// Future orientation adapter: not instantiated by this playback-only prototype.
export interface OrientationObservation { timestamp: number; status: 'unavailable' | 'uncertain' | 'valid'; }
export interface OrientationSource { subscribe(listener: (observation: OrientationObservation) => void): () => void; }
