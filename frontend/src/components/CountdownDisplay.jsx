import { useRoundCountdown } from '../hooks/useRoundCountdown';

export default function CountdownDisplay({ round, variant = 'default' }) {
  const remaining = useRoundCountdown(round);
  const active = round?.status === 'active';
  const paused = round?.countdownPaused;
  const urgent = active && !paused && remaining <= 5;

  if (!active) return null;

  return (
    <div
      className={`countdown-display countdown-display--${variant}${paused ? ' countdown-display--paused' : ''}${urgent ? ' countdown-display--urgent' : ''}`}
      aria-live="polite"
    >
      <span className="countdown-label">{paused ? '暫停倒數' : '倒數時間'}</span>
      <span className="countdown-value">{remaining}s</span>
    </div>
  );
}
