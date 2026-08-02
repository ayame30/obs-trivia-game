import { useRoundCountdown } from '../hooks/useRoundCountdown';
import { formatCountdownValue, useAppSettings } from '../hooks/useAppSettings';
import type { Round } from '../types';

interface CountdownDisplayProps {
  round: Round | null | undefined;
  variant?: 'default' | 'overlay';
}

export default function CountdownDisplay({ round, variant = 'default' }: CountdownDisplayProps) {
  const remaining = useRoundCountdown(round);
  const { countdownLabel, countdownPausedLabel, countdownValueTemplate } = useAppSettings();
  const active = round?.status === 'active';
  const paused = round?.countdownPaused;
  const urgent = active && !paused && remaining <= 5;

  return (
    <div
      className={`countdown-display countdown-display--${variant}${paused ? ' countdown-display--paused' : ''}${urgent ? ' countdown-display--urgent' : ''}`}
      aria-live="polite"
    >
      {active ? (
        <>
          <span className="countdown-label">{paused ? countdownPausedLabel : countdownLabel}</span>
          <span className="countdown-value">
            {formatCountdownValue(countdownValueTemplate, remaining)}
          </span>
        </>
      ) : (
        <>
          <span className="countdown-label">{'\u00A0'}</span>
          <span className="countdown-value">{'\u00A0'}</span>
        </>
      )}
    </div>
  );
}
