import { motion, AnimatePresence } from 'framer-motion';
import type { ScoreboardEntry } from '../types';

interface ScoreboardPanelProps {
  entries: ScoreboardEntry[];
}

export default function ScoreboardPanel({ entries }: ScoreboardPanelProps) {
  const sorted = [...entries].sort((a, b) => b.score - a.score);

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
              {entry.score * 10}
            </strong>
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ol>
  );
}
