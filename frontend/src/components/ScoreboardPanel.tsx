import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScoreboardEntry } from '../types';

interface ScoreboardPanelProps {
  entries: ScoreboardEntry[];
}

const SCOREBOARD_SLOTS = 10;

export default function ScoreboardPanel({ entries }: ScoreboardPanelProps) {
  const sorted = useMemo(() => {
    const ranked = [...entries].sort((a, b) => b.score - a.score);
    if (ranked.length >= SCOREBOARD_SLOTS) return ranked;

    const placeholders: ScoreboardEntry[] = Array.from(
      { length: SCOREBOARD_SLOTS - ranked.length },
      (_, index) => ({
        twitchUserId: `placeholder-${index}`,
        displayName: '-',
        score: 0,
      })
    );
    return [...ranked, ...placeholders];
  }, [entries]);
  return (
    <motion.ol layout className="scoreboard-list" style={{ listStyle: 'none', padding: 0 }}>
      <AnimatePresence>
        {sorted.map((entry) => (
          <motion.li
            key={entry.twitchUserId}
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
          >
            <span className="scoreboard-name name" style={{ fontWeight: 900 }}>
              {entry.displayName}
            </span>
            <strong className="scoreboard-score score" style={{ fontWeight: 900 }}>
              {entry.score}
            </strong>
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ol>
  );
}
