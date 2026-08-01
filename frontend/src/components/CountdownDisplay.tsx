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


  return (
    <div
      className={`countdown-display countdown-display--${variant}${paused ? ' countdown-display--paused' : ''}${urgent ? ' countdown-display--urgent' : ''}`}
      aria-live="polite"
    >
      {
        active ? (
          <>
            <span className="countdown-label">{paused ? '暫停倒數' : '倒數時間'}</span>
            <span className="countdown-value">{remaining}s</span>
          </>
        ) : (
          <>
            <span className="countdown-label">{"\u00A0"}</span>
            <span className="countdown-value">{"\u00A0"}</span>
          </>
        )
      }
    </div>
  );
}
