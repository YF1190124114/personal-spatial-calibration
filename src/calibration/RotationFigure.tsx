import type { CSSProperties } from 'react';
export function RotationFigure({ angle, paused }: { angle: number; paused: boolean }) {
  return <div className={`rotation-demo ${paused ? 'animation-paused' : ''}`} style={{ '--target-turn': `${angle}deg` } as CSSProperties} role="img" aria-label={`Illustrated human turning right to the ${angle} degree movement prompt. Demonstration only.`}>
    <div className="figure-stage"><div className="human-figure"><div className="human-head"><i/></div><div className="human-body"><i className="arm left"/><i className="arm right"/><i className="leg left"/><i className="leg right"/><span className="shirt-front"/></div></div></div>
    <svg className="rotation-arrow" viewBox="0 0 180 36" aria-hidden="true"><path d="M25 12 C30 34 148 34 155 12 M146 14 L155 10 L160 20"/></svg><span className="figure-caption">Turn to your right · demonstration</span>
  </div>;
}
