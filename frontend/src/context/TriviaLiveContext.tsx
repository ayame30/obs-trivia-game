import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useSubscription } from '@apollo/client/react';
import {
  GET_ACTIVE_ROUND,
  GET_SCOREBOARD,
  QUESTION_STARTED,
  VOTE_COUNTS_UPDATED,
  COUNTDOWN_UPDATED,
  QUESTION_ENDED,
  SCOREBOARD_UPDATED,
  ROUNDS_RESET,
} from '../graphql/operations';
import type {
  Round,
  ScoreboardEntry,
  TriviaLiveContextValue,
  GetActiveRoundData,
  GetScoreboardData,
  QuestionStartedData,
  VoteCountsUpdatedData,
  CountdownUpdatedData,
  QuestionEndedData,
  ScoreboardUpdatedData,
  RoundsResetData,
} from '../types';

const TriviaLiveContext = createContext<TriviaLiveContextValue | null>(null);

export function TriviaLiveProvider({ children }: { children: ReactNode }) {
  const [round, setRound] = useState<Round | null>(null);
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [subError, setSubError] = useState<string | null>(null);

  const { data: roundData, loading: roundLoading, refetch: refetchRound } = useQuery<GetActiveRoundData>(
    GET_ACTIVE_ROUND
  );
  const { data: scoreData, loading: scoreLoading, refetch: refetchScoreboard } = useQuery<GetScoreboardData>(
    GET_SCOREBOARD
  );

  useEffect(() => {
    setRound(roundData?.activeRound ?? null);
  }, [roundData]);

  useEffect(() => {
    setScoreboard(scoreData?.scoreboard ?? []);
  }, [scoreData]);

  const subOptions = {
    onError: (err: Error) => setSubError(err.message),
  };

  const { data: startedData } = useSubscription<QuestionStartedData>(QUESTION_STARTED, subOptions);
  const { data: votesData } = useSubscription<VoteCountsUpdatedData>(VOTE_COUNTS_UPDATED, subOptions);
  const { data: countdownData } = useSubscription<CountdownUpdatedData>(COUNTDOWN_UPDATED, subOptions);
  const { data: endedData } = useSubscription<QuestionEndedData>(QUESTION_ENDED, subOptions);
  const { data: boardData } = useSubscription<ScoreboardUpdatedData>(SCOREBOARD_UPDATED, subOptions);
  const { data: roundsResetData } = useSubscription<RoundsResetData>(ROUNDS_RESET, subOptions);

  useEffect(() => {
    if (startedData?.questionStarted) {
      setRound(startedData.questionStarted);
      setSubError(null);
    }
  }, [startedData]);

  useEffect(() => {
    const counts = votesData?.voteCountsUpdated;
    if (!counts) return;
    setRound((prev) =>
      prev && prev.status === 'active' ? { ...prev, voteCounts: counts } : prev
    );
    setSubError(null);
  }, [votesData]);

  useEffect(() => {
    if (countdownData?.countdownUpdated) {
      setRound(countdownData.countdownUpdated);
      setSubError(null);
    }
  }, [countdownData]);

  useEffect(() => {
    if (endedData?.questionEnded) {
      setRound(endedData.questionEnded);
      setSubError(null);
    }
  }, [endedData]);

  useEffect(() => {
    if (boardData?.scoreboardUpdated) {
      setScoreboard(boardData.scoreboardUpdated);
      setSubError(null);
    }
  }, [boardData]);

  useEffect(() => {
    if (roundsResetData?.roundsReset) {
      setRound(null);
      setSubError(null);
    }
  }, [roundsResetData]);

  const value = useMemo(
    (): TriviaLiveContextValue => ({
      round,
      setRound,
      scoreboard,
      setScoreboard,
      loading: roundLoading || scoreLoading,
      subError,
      refresh: () => {
        refetchRound();
        refetchScoreboard();
      },
    }),
    [round, scoreboard, roundLoading, scoreLoading, subError, refetchRound, refetchScoreboard]
  );

  return (
    <TriviaLiveContext.Provider value={value}>{children}</TriviaLiveContext.Provider>
  );
}

export function useTriviaLive(): TriviaLiveContextValue {
  const ctx = useContext(TriviaLiveContext);
  if (!ctx) {
    throw new Error('useTriviaLive must be used within TriviaLiveProvider');
  }
  return ctx;
}
