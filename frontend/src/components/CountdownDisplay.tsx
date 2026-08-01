import { useRoundCountdown } from '../hooks/useRoundCountdown';
import type { Round } from '../types';

interface CountdownDisplayProps {
  round: Round | null | undefined;
  variant?: 'default' | 'overlay';
}

export default function CountdownDisplay({ round, variant = 'default' }: CountdownDisplayProps) {
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
