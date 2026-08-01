import { useEffect, useState } from 'react';
import type { Round } from '../types';

export function useRoundCountdown(round: Round | null | undefined): number {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!round || round.status !== 'active') {
      setRemaining(0);
      return;
    }

    const tick = () => {
      if (round.countdownPaused) {
        setRemaining(round.countdownRemainingSeconds ?? 0);
        return;
      }
      if (round.countdownEndsAt) {
        const left = Math.max(
          0,
          Math.ceil((new Date(round.countdownEndsAt).getTime() - Date.now()) / 1000)
        );
        setRemaining(left);
        return;
      }
      setRemaining(round.countdownRemainingSeconds ?? round.countdownSeconds ?? 0);
    };

    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [
    round?.status,
    round?.countdownPaused,
    round?.countdownEndsAt,
    round?.countdownRemainingSeconds,
    round?.countdownSeconds,
  ]);

  return remaining;
}
