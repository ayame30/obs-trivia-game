import type { Round } from '../types';
import { DEFAULT_IDLE_QUESTION_TEXT } from '../hooks/useAppSettings';

/** Structural placeholder only — idle question text comes from app settings. */
export const OVERLAY_PLACEHOLDER_ROUND: Round = {
  id: '—',
  questionId: '0',
  status: 'ended',
  startedAt: '',
  question: {
    id: '0',
    text: DEFAULT_IDLE_QUESTION_TEXT,
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: null,
    countdownSeconds: 30,
  },
  voteCounts: { A: 0, B: 0, C: 0, D: 0, total: 0 },
  countdownSeconds: 30,
  countdownRemainingSeconds: 0,
  countdownPaused: false,
};
