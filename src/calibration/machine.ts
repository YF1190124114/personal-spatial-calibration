export const DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315] as const;
export type Phase = 'idle' | 'preparation' | 'rotate' | 'countdown' | 'feedback' | 'complete';
export type State = { phase: Phase; step: number; completed: number; count: number; paused: boolean };
export type Event = { type: 'START' | 'READY' | 'CONFIRM' | 'TICK' | 'NEXT' | 'PAUSE' | 'RESUME' | 'PREVIOUS' | 'RESTART' | 'EXIT' };
export const initialState: State = { phase: 'idle', step: 0, completed: 0, count: 3, paused: false };
export function calibrationReducer(state: State, event: Event): State {
  if (event.type === 'EXIT') return { ...initialState };
  if ((event.type === 'START' && state.phase === 'idle') || (event.type === 'RESTART' && state.phase !== 'idle')) return { ...initialState, phase: 'preparation' };
  if (event.type === 'PAUSE' && ['preparation', 'rotate', 'countdown', 'feedback'].includes(state.phase)) return { ...state, paused: true };
  if (event.type === 'RESUME') return { ...state, paused: false };
  if (state.paused) return state;
  if (event.type === 'PREVIOUS' && state.step > 0 && ['rotate', 'countdown', 'feedback', 'complete'].includes(state.phase)) {
    const step = state.phase === 'complete' ? 7 : state.step - 1;
    return { ...state, phase: 'rotate', step, completed: step, count: 3 };
  }
  if (event.type === 'READY' && state.phase === 'preparation') return { ...state, phase: 'rotate' };
  if (event.type === 'CONFIRM' && state.phase === 'rotate') return { ...state, phase: 'countdown', count: 3 };
  if (event.type === 'TICK' && state.phase === 'countdown') return state.count > 1 ? { ...state, count: state.count - 1 } : { ...state, phase: 'feedback', count: 0, completed: state.step + 1 };
  if (event.type === 'NEXT' && state.phase === 'feedback') return state.step === 7 ? { ...state, phase: 'complete' } : { ...state, phase: 'rotate', step: state.step + 1, count: 3 };
  return state;
}
// Future adapters are contracts only. V0.4 never instantiates or calls them.
export interface OrientationObservation { timestamp: number; status: 'unavailable' | 'uncertain' | 'valid'; }
export interface OrientationSource { subscribe(listener: (observation: OrientationObservation) => void): () => void; }
export interface AudioSession { start(): Promise<void>; stop(): Promise<void>; }
