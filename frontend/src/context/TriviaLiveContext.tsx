import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery, useSubscription } from '@apollo/client/react';
import {
  GRAPHQL_WS_STATUS_EVENT,
  type GraphqlWsStatusDetail,
} from '../apollo/client';
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

const RESTART_DELAY_MS = 1500;

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

  const restartTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const restartFns = useRef<Array<() => void>>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearRestartTimers();
    };
  }, []);

  function clearRestartTimers() {
    for (const timer of restartTimers.current) clearTimeout(timer);
    restartTimers.current = [];
  }

  function scheduleSubscriptionRestart(reason: string) {
    if (!mountedRef.current) return;
    setSubError(reason);
    clearRestartTimers();
    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      for (const restart of restartFns.current) {
        try {
          restart();
        } catch (err) {
          console.error('[subscriptions] restart failed', err);
        }
      }
      void refetchRound();
      void refetchScoreboard();
    }, RESTART_DELAY_MS);
    restartTimers.current.push(timer);
  }

  const subOptions = {
    onError: (err: Error) => {
      console.warn('[subscriptions] error', err.message);
      scheduleSubscriptionRestart('Live connection lost. Reconnecting…');
    },
  };

  const started = useSubscription<QuestionStartedData>(QUESTION_STARTED, subOptions);
  const votes = useSubscription<VoteCountsUpdatedData>(VOTE_COUNTS_UPDATED, subOptions);
  const countdown = useSubscription<CountdownUpdatedData>(COUNTDOWN_UPDATED, subOptions);
  const ended = useSubscription<QuestionEndedData>(QUESTION_ENDED, subOptions);
  const board = useSubscription<ScoreboardUpdatedData>(SCOREBOARD_UPDATED, subOptions);
  const roundsReset = useSubscription<RoundsResetData>(ROUNDS_RESET, subOptions);

  useEffect(() => {
    restartFns.current = [
      started.restart,
      votes.restart,
      countdown.restart,
      ended.restart,
      board.restart,
      roundsReset.restart,
    ];
  }, [
    started.restart,
    votes.restart,
    countdown.restart,
    ended.restart,
    board.restart,
    roundsReset.restart,
  ]);

  useEffect(() => {
    const onWsStatus = (event: Event) => {
      const status = (event as CustomEvent<GraphqlWsStatusDetail>).detail?.status;
      if (status === 'closed') {
        setSubError('Live connection lost. Reconnecting…');
        return;
      }
      if (status === 'connected') {
        clearRestartTimers();
        setSubError(null);
        for (const restart of restartFns.current) {
          try {
            restart();
          } catch (err) {
            console.error('[subscriptions] restart after reconnect failed', err);
          }
        }
        void refetchRound();
        void refetchScoreboard();
      }
    };

    window.addEventListener(GRAPHQL_WS_STATUS_EVENT, onWsStatus);
    return () => {
      window.removeEventListener(GRAPHQL_WS_STATUS_EVENT, onWsStatus);
      clearRestartTimers();
    };
  }, [refetchRound, refetchScoreboard]);

  useEffect(() => {
    if (started.data?.questionStarted) {
      setRound(started.data.questionStarted);
      setSubError(null);
    }
  }, [started.data]);

  useEffect(() => {
    const counts = votes.data?.voteCountsUpdated;
    if (!counts) return;
    setRound((prev) =>
      prev && prev.status === 'active' ? { ...prev, voteCounts: counts } : prev
    );
    setSubError(null);
  }, [votes.data]);

  useEffect(() => {
    if (countdown.data?.countdownUpdated) {
      setRound(countdown.data.countdownUpdated);
      setSubError(null);
    }
  }, [countdown.data]);

  useEffect(() => {
    if (ended.data?.questionEnded) {
      setRound(ended.data.questionEnded);
      setSubError(null);
    }
  }, [ended.data]);

  useEffect(() => {
    if (board.data?.scoreboardUpdated) {
      setScoreboard(board.data.scoreboardUpdated);
      setSubError(null);
    }
  }, [board.data]);

  useEffect(() => {
    if (roundsReset.data?.roundsReset) {
      setRound(null);
      setSubError(null);
    }
  }, [roundsReset.data]);

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
