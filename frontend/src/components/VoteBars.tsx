import type { AnswerChoice, VoteCounts } from '../types';

const CHOICES: Array<{ key: AnswerChoice; label: string; className: string }> = [
  { key: 'A', label: 'A', className: 'a' },
  { key: 'B', label: 'B', className: 'b' },
  { key: 'C', label: 'C', className: 'c' },
  { key: 'D', label: 'D', className: 'd' },
];

interface VoteBarsProps {
  voteCounts: VoteCounts | null | undefined;
  correctAnswer?: AnswerChoice | null;
  showCorrect?: boolean;
}

export default function VoteBars({ voteCounts, correctAnswer, showCorrect }: VoteBarsProps) {
  const total = voteCounts?.total || 0;

  return (
    <div className="vote-bars">
      {CHOICES.map(({ key, label, className }) => {
        const count = voteCounts?.[key] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        const isCorrect = showCorrect && correctAnswer === key;

        return (
          <div
            key={key}
            className={`vote-row ${className}${isCorrect ? ' correct' : ''}`}
            style={
              isCorrect
                ? { outline: '2px solid var(--success)', borderRadius: 8, padding: 4 }
                : { outline: '2px solid transparent', borderRadius: 8, padding: 4 }
            }
          >
            <span className="label">{label}</span>
            <div className="bar-wrap">
              <div className="bar" style={{ width: `${pct}%` }} />
            </div>
            <span>{count}</span>
          </div>
        );
      })}
      <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
        Total votes: {total}
      </div>
    </div>
  );
}
