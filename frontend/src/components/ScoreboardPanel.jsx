import { motion, AnimatePresence } from 'framer-motion';

export default function ScoreboardPanel({ entries }) {
  // 1. Sort the entries as you did originally
  const sorted = [...entries].sort((a, b) => b.score - a.score);

  return (
    // motion.ol serves as the animated container
    <motion.ol layout className="scoreboard-list" style={{ listStyle: 'none', padding: 0 }}>
      <AnimatePresence>
        {sorted.map((entry, i) => (
          // motion.li with the 'layout' prop automatically animates position changes
          <motion.li
            key={entry.twitchUserId} // CRITICAL: This must be unique and persistent
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
          >
            <span className="name" style={{ fontWeight: 900}}>
              {entry.displayName}
            </span>
            <strong className="score" style={{ fontWeight: 900}}>{entry.score}</strong>
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ol>
  );
}