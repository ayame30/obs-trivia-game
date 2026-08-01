import type { Round } from '../types';

export const OVERLAY_PLACEHOLDER_ROUND: Round = {
  id: '—',
  questionId: '0',
  status: 'ended',
  startedAt: '',
  question: {
    id: '0',
    text: '即將開始',
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
