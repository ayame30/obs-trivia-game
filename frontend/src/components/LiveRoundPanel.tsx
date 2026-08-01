import CountdownDisplay from './CountdownDisplay';
import ResizeText from './ResizeText';
import type { AnswerChoice, Round } from '../types';

interface LiveRoundPanelProps {
  round: Round | null | undefined;
  showCorrect?: boolean;
  showCountdown?: boolean;
  countdownVariant?: 'default' | 'overlay';
}

const OPTION_KEYS: AnswerChoice[] = ['A', 'B', 'C', 'D'];

export default function LiveRoundPanel({
  round,
  showCorrect = false,
  countdownVariant = 'default',
}: LiveRoundPanelProps) {
  if (!round) {
    return (
      <p className="live-round-panel__empty">
        No active round. Start a question from the question bank.
      </p>
    );
  }

  const q = round.question;

  return (
    <div className="live-round-panel">
      <div className="live-round-panel__stage">
        <div className="live-round-panel__question">
          <div className="live-round-panel__question_header">
            <div className="live-round-panel__question_count_text">
              第{round.id}題
            </div>
            <div className="live-round-panel__countdown-slot">
              <CountdownDisplay round={round} variant={countdownVariant} />
            </div>
          </div>
          <div className="live-round-panel__question_text">
            <ResizeText text={q.text} />
          </div>
        </div>

        <div className="live-round-panel__options">
          {OPTION_KEYS.map((key) => {
            const count = round.voteCounts?.[key];
            const isCorrect = showCorrect && q.correctAnswer === key;
            return (
              <div
                key={key}
                className={`live-round-panel__option${isCorrect ? ' live-round-panel__option--correct' : ''}`}
              >
                <span className="live-round-panel__option_label">{key}</span>
                <ResizeText text={q[`option${key}`]} />
                {count ? (
                  <div className="live-round-panel__vote-count">
                    <span>{count}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
