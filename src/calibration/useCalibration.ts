import { useEffect, useReducer } from 'react';
import { calibrationReducer, initialState } from './machine';
export function useCalibration() {
  const [state, dispatch] = useReducer(calibrationReducer, initialState);
  useEffect(() => {
    if (state.phase !== 'countdown' || state.paused) return;
    const timer = window.setTimeout(() => dispatch({ type: 'TICK' }), 1000);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.count, state.paused]);
  useEffect(() => {
    const hide = () => { if (document.hidden) dispatch({ type: 'PAUSE' }); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  return { state, dispatch };
}
