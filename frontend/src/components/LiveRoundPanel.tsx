import CountdownDisplay from './CountdownDisplay';
import ResizeText from './ResizeText';
import { OVERLAY_PLACEHOLDER_ROUND } from '../constants/overlayPlaceholder';
import { formatRoundLabel, useAppSettings } from '../hooks/useAppSettings';
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
  const { roundLabelTemplate, roundLabelIdle, idleQuestionText } = useAppSettings();
  const isPlaceholder = round == null;
  const displayRound = round ?? OVERLAY_PLACEHOLDER_ROUND;
  const q = displayRound.question;
  const questionText = isPlaceholder ? idleQuestionText : q.text;
  const roundLabel = isPlaceholder
    ? roundLabelIdle
    : formatRoundLabel(roundLabelTemplate, round?.id ?? '');

  return (
    <div className={`live-round-panel${isPlaceholder ? ' live-round-panel--placeholder' : ''}`}>
      <div className="live-round-panel__stage">
        <div className="live-round-panel__question">
          <div className="live-round-panel__question_header">
            <div className="live-round-panel__question_count_text">{roundLabel}</div>
            <div className="live-round-panel__countdown-slot">
              <CountdownDisplay round={round} variant={countdownVariant} />
            </div>
          </div>
          <div className="live-round-panel__question_text">
            <ResizeText text={questionText} />
          </div>
        </div>

        <div className="live-round-panel__options">
          {OPTION_KEYS.map((key) => {
            const count = displayRound.voteCounts?.[key];
            const isCorrect = showCorrect && !isPlaceholder && q.correctAnswer === key;
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
