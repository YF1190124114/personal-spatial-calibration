import { DIRECTIONS, type State } from './machine';
export function ProgressRing({ state }: { state: State }) {
  return <div className="sequence-progress"><svg viewBox="0 0 160 160" role="img" aria-label={`${state.completed} of 8 directions complete`}>
    {DIRECTIONS.map((angle, i) => {
      const start = (angle - 90 + 5) * Math.PI / 180, end = (angle - 90 + 40) * Math.PI / 180;
      const path = `M ${80 + 62 * Math.cos(start)} ${80 + 62 * Math.sin(start)} A 62 62 0 0 1 ${80 + 62 * Math.cos(end)} ${80 + 62 * Math.sin(end)}`;
      return <path key={angle} d={path} className={i < state.completed ? 'segment done' : i === state.step && state.phase !== 'preparation' ? 'segment current' : 'segment'} />;
    })}<text x="80" y="78" textAnchor="middle" className="ring-number">{state.completed}/8</text><text x="80" y="98" textAnchor="middle" className="ring-caption">COMPLETE</text>
  </svg><ol className="direction-list" aria-label="Movement directions">{DIRECTIONS.map((angle, i) => <li key={angle} aria-current={i === state.step && state.phase !== 'preparation' && state.phase !== 'complete' ? 'step' : undefined} className={i < state.completed ? 'done' : ''}>{angle}° <span>{i < state.completed ? '✓' : i === state.step && state.phase !== 'preparation' ? 'Current' : 'Remaining'}</span></li>)}</ol></div>;
}
