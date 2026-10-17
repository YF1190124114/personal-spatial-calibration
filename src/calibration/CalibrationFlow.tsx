import { useEffect, useRef, type Dispatch } from 'react';
import { DIRECTIONS, type Event, type State } from './machine';
import { ProgressRing } from './ProgressRing';
import { RotationFigure } from './RotationFigure';
const instructions = ['Face the camera. This is your starting direction.', 'Turn one eighth of a full turn to your right from the starting position.', 'Turn a quarter turn to your right. Your side faces the camera.', 'Continue right, halfway between a side view and facing away.', 'Face away from the camera, half a turn from your starting position.', 'Continue right, halfway between facing away and the other side view.', 'Continue right to the other side view, three quarters of a full turn.', 'Continue right, halfway between the side view and facing the camera again.'];
export function CalibrationFlow({ state, dispatch, trackingStatus, cameraReady }: { state: State; dispatch: Dispatch<Event>; trackingStatus: string; cameraReady: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [state.phase, state.step]);
  const preparation = state.phase === 'preparation', complete = state.phase === 'complete';
  return <section className="calibration-flow" aria-label="Guided movement sequence">
    <div className="flow-heading"><div><p className="eyebrow">{complete ? 'SEQUENCE FINISHED' : preparation ? 'PREPARATION' : `DIRECTION ${state.step + 1} OF 8`}</p><h2 ref={heading} tabIndex={-1}>{complete ? 'Movement sequence complete.' : preparation ? 'Prepare your position' : `Target direction: ${DIRECTIONS[state.step]}°`}</h2></div><span className="prototype-note">Manual interaction prototype</span></div>
    <p className="flow-disclaimer">Directions are movement prompts. Your confirmation is manual; pose tracking does not validate direction. No audio is recorded.</p>
    {state.paused && <div className="pause-notice" role="status">Sequence paused. Resume when you are ready; the camera and pose tracking stay available.</div>}
    <div className="flow-content"><div className="flow-task">
      {preparation ? <><h3>Keep your upper body in view.</h3><p>Place your phone securely, leave room to turn, and begin facing the camera. Keep your head and shoulders visible when possible.</p><p className="preparation-status" role="status">Pose tracking: {trackingStatus}</p>{!cameraReady && <p>Camera is not ready. You can inspect this manual flow, but the live preview needs camera access.</p>}<button className="primary" disabled={state.paused} onClick={() => dispatch({type:'READY'})}>I'm Ready <span aria-hidden="true">→</span></button></> : complete ? <><h3>All eight movement prompts are complete.</h3><p>You manually confirmed each direction and completed each hold. This does not mean acoustic calibration succeeded. No dataset was created.</p><button className="primary" onClick={() => dispatch({type:'EXIT'})}>Return to camera <span aria-hidden="true">→</span></button></> : <>
      <RotationFigure key={state.step} angle={DIRECTIONS[state.step]} paused={state.paused}/>
      <p className="movement-instruction">{instructions[state.step]}</p>
      {state.phase === 'rotate' && <><p>Move at your own pace. Confirm when you believe you are at the target direction.</p><button className="primary" disabled={state.paused} onClick={() => dispatch({type:'CONFIRM'})}>I'm at {DIRECTIONS[state.step]}° <span aria-hidden="true">→</span></button></>}
      {state.phase === 'countdown' && <div className="hold-state" role="status"><h3>Hold still.</h3><span className="countdown">{state.count}</span><p>{state.paused ? 'Countdown paused.' : 'Keep this position until the countdown finishes.'}</p></div>}
      {state.phase === 'feedback' && <div className="step-feedback" role="status"><h3>✓ {DIRECTIONS[state.step]}° step complete</h3><p>Manual confirmation and hold complete.</p><button className="primary" disabled={state.paused} onClick={() => dispatch({type:'NEXT'})}>{state.step === 7 ? 'Finish sequence' : 'Next direction'} <span aria-hidden="true">→</span></button></div>}
      </>}
    </div><ProgressRing state={state}/></div>
    <nav className="flow-controls" aria-label="Sequence controls">{!complete && <button className="secondary" onClick={() => dispatch({type:state.paused ? 'RESUME' : 'PAUSE'})}>{state.paused ? 'Resume' : 'Pause'}</button>}<button className="secondary" disabled={state.paused || preparation || state.step === 0} onClick={() => dispatch({type:'PREVIOUS'})}>Previous step</button><button className="secondary" onClick={() => dispatch({type:'RESTART'})}>Restart</button><button className="secondary" onClick={() => dispatch({type:'EXIT'})}>Exit</button></nav>
  </section>;
}
