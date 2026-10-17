import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { calibrationReducer, initialState, type Event } from './machine';
import { ESS_ASSET, EssPlayer } from '../audio/EssPlayer';
export function useCalibration() {
  const [state, send] = useReducer(calibrationReducer, initialState);
  const [player] = useState(() => new EssPlayer(`${import.meta.env.BASE_URL}${ESS_ASSET}`));
  const [audio, setAudio] = useState<{ busy: boolean; error?: string; remaining: number }>({ busy: false, remaining: 3 });
  const operation = useRef(0);
  const dispatch = useCallback((event: Event) => {
    const id = ++operation.current;
    if (['PAUSE', 'PREVIOUS', 'RESTART', 'EXIT'].includes(event.type)) {
      player.stop(); setAudio({ busy: false, remaining: 3 });
    }
    if (['READY', 'CONFIRM', 'RESUME'].includes(event.type)) {
      setAudio({ busy: true, remaining: 3 });
      // prepare() starts resume synchronously in this user-gesture call stack.
      void player.prepare().then(() => {
        if (id !== operation.current) return;
        setAudio({ busy: false, remaining: 3 }); send(event);
      }).catch(() => {
        if (id !== operation.current) return;
        setAudio({ busy: false, remaining: 3, error: 'Could not enable the calibration sound. Check your browser audio permissions and connection, then retry. No playback was completed.' });
      });
      return;
    }
    send(event);
  }, [player]);
  useEffect(() => {
    if (state.phase !== 'countdown' || state.paused) return;
    const timer = window.setTimeout(() => send({ type: 'TICK' }), 1000);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.count, state.paused]);
  useEffect(() => {
    if (state.phase !== 'playing' || state.paused) return;
    let current = true;
    try {
      player.play(() => { if (current) send({ type: 'AUDIO_ENDED' }); });
    } catch {
      setAudio({ busy: false, remaining: 3, error: 'Playback could not start. Tap the direction confirmation again to retry sound.' });
      send({ type: 'AUDIO_FAILED' });
    }
    const timer = window.setInterval(() => { if (current) setAudio({ busy: false, remaining: player.remaining }); }, 100);
    return () => { current = false; window.clearInterval(timer); player.stop(); };
  }, [state.phase, state.step, state.paused, player]);
  useEffect(() => {
    const pause = () => dispatch({ type: 'PAUSE' });
    const hide = () => { if (document.hidden) pause(); };
    player.onInterrupted = pause;
    document.addEventListener('visibilitychange', hide);
    return () => { operation.current++; document.removeEventListener('visibilitychange', hide); player.onInterrupted = undefined; player.dispose(); };
  }, [dispatch, player]);
  return { state, dispatch, audio };
}
