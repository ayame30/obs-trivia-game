import { createContext, useContext, useEffect, useMemo, useState } from 'react';
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

const TriviaLiveContext = createContext(null);

export function TriviaLiveProvider({ children }) {
  const [round, setRound] = useState(null);
  const [scoreboard, setScoreboard] = useState([]);
  const [subError, setSubError] = useState(null);

  const { data: roundData, loading: roundLoading, refetch: refetchRound } = useQuery(
    GET_ACTIVE_ROUND
  );
  const { data: scoreData, loading: scoreLoading, refetch: refetchScoreboard } = useQuery(
    GET_SCOREBOARD
  );

  useEffect(() => {
    setRound(roundData?.activeRound ?? null);
  }, [roundData]);

  useEffect(() => {
    setScoreboard(scoreData?.scoreboard ?? []);
  }, [scoreData]);

  const subOptions = {
    onError: (err) => setSubError(err.message),
  };

  const { data: startedData } = useSubscription(QUESTION_STARTED, subOptions);
  const { data: votesData } = useSubscription(VOTE_COUNTS_UPDATED, subOptions);
  const { data: countdownData } = useSubscription(COUNTDOWN_UPDATED, subOptions);
  const { data: endedData } = useSubscription(QUESTION_ENDED, subOptions);
  const { data: boardData } = useSubscription(SCOREBOARD_UPDATED, subOptions);
  const { data: roundsResetData } = useSubscription(ROUNDS_RESET, subOptions);

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
    () => ({
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

export function useTriviaLive() {
  const ctx = useContext(TriviaLiveContext);
  if (!ctx) {
    throw new Error('useTriviaLive must be used within TriviaLiveProvider');
  }
  return ctx;
}
