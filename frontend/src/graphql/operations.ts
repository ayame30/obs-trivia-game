import { gql } from '@apollo/client';

export const QUESTION_FIELDS = gql`
  fragment QuestionFields on Question {
    id
    text
    optionA
    optionB
    optionC
    optionD
    correctAnswer
    countdownSeconds
    createdAt
  }
`;

export const VOTE_COUNTS_FIELDS = gql`
  fragment VoteCountsFields on VoteCounts {
    A
    B
    C
    D
    total
  }
`;

export const ROUND_FIELDS = gql`
  fragment RoundFields on Round {
    id
    questionId
    status
    startedAt
    endedAt
    countdownSeconds
    countdownRemainingSeconds
    countdownPaused
    countdownEndsAt
    question {
      ...QuestionFields
    }
    voteCounts {
      ...VoteCountsFields
    }
  }
  ${QUESTION_FIELDS}
  ${VOTE_COUNTS_FIELDS}
`;

export const GET_QUESTIONS = gql`
  query GetQuestions {
    questions {
      ...QuestionFields
    }
  }
  ${QUESTION_FIELDS}
`;

export const GET_ACTIVE_ROUND = gql`
  query GetActiveRound {
    activeRound {
      ...RoundFields
    }
  }
  ${ROUND_FIELDS}
`;

export const GET_TWITCH_CONFIG = gql`
  query GetTwitchConfig {
    twitchConfig {
      login
      userId
      channel
      updatedAt
      hasToken
      chatConnected
    }
  }
`;

export const GET_SCOREBOARD = gql`
  query GetScoreboard {
    scoreboard {
      twitchUserId
      displayName
      score
    }
  }
`;

export const CREATE_QUESTION = gql`
  mutation CreateQuestion($input: CreateQuestionInput!) {
    createQuestion(input: $input) {
      ...QuestionFields
    }
  }
  ${QUESTION_FIELDS}
`;

export const UPDATE_QUESTION = gql`
  mutation UpdateQuestion($id: ID!, $input: UpdateQuestionInput!) {
    updateQuestion(id: $id, input: $input) {
      ...QuestionFields
    }
  }
  ${QUESTION_FIELDS}
`;

export const DELETE_QUESTION = gql`
  mutation DeleteQuestion($id: ID!) {
    deleteQuestion(id: $id)
  }
`;

export const SET_TWITCH_TOKEN = gql`
  mutation SetTwitchToken($accessToken: String!, $channel: String) {
    setTwitchToken(accessToken: $accessToken, channel: $channel) {
      login
      userId
      channel
      hasToken
      chatConnected
    }
  }
`;

export const START_QUESTION = gql`
  mutation StartQuestion($questionId: ID!) {
    startQuestion(questionId: $questionId) {
      ...RoundFields
    }
  }
  ${ROUND_FIELDS}
`;

export const STOP_QUESTION = gql`
  mutation StopQuestion {
    stopQuestion {
      ...RoundFields
    }
  }
  ${ROUND_FIELDS}
`;

export const PAUSE_COUNTDOWN = gql`
  mutation PauseCountdown {
    pauseCountdown {
      ...RoundFields
    }
  }
  ${ROUND_FIELDS}
`;

export const RESUME_COUNTDOWN = gql`
  mutation ResumeCountdown {
    resumeCountdown {
      ...RoundFields
    }
  }
  ${ROUND_FIELDS}
`;

export const RESET_SCOREBOARD = gql`
  mutation ResetScoreboard {
    resetScoreboard {
      twitchUserId
      displayName
      score
    }
  }
`;

export const UPDATE_SCOREBOARD = gql`
  mutation UpdateScoreboard($updates: [ScoreboardUpdateInput!]!) {
    updateScoreboard(updates: $updates) {
      twitchUserId
      displayName
      score
    }
  }
`;

export const RESET_ROUNDS = gql`
  mutation ResetRounds {
    resetRounds
  }
`;

export const ROUNDS_RESET = gql`
  subscription OnRoundsReset {
    roundsReset
  }
`;

export const RECONNECT_TWITCH = gql`
  mutation ReconnectTwitchChat {
    reconnectTwitchChat
  }
`;

export const SEND_TWITCH_CHAT_MESSAGE = gql`
  mutation SendTwitchChatMessage($message: String!) {
    sendTwitchChatMessage(message: $message)
  }
`;

export const GET_APP_SETTINGS = gql`
  query GetAppSettings {
    appSettings {
      showQuestionChat
      questionChatTemplate
      showCutoffChat
      cutoffChatMessage
      scoreMultiplier
      updatedAt
    }
  }
`;

export const UPDATE_APP_SETTINGS = gql`
  mutation UpdateAppSettings($input: UpdateAppSettingsInput!) {
    updateAppSettings(input: $input) {
      showQuestionChat
      questionChatTemplate
      showCutoffChat
      cutoffChatMessage
      scoreMultiplier
      updatedAt
    }
  }
`;

export const QUESTION_STARTED = gql`
  subscription OnQuestionStarted {
    questionStarted {
      ...RoundFields
    }
  }
  ${ROUND_FIELDS}
`;

export const VOTE_COUNTS_UPDATED = gql`
  subscription OnVoteCountsUpdated {
    voteCountsUpdated {
      ...VoteCountsFields
    }
  }
  ${VOTE_COUNTS_FIELDS}
`;

export const COUNTDOWN_UPDATED = gql`
  subscription OnCountdownUpdated {
    countdownUpdated {
      ...RoundFields
    }
  }
  ${ROUND_FIELDS}
`;

export const QUESTION_ENDED = gql`
  subscription OnQuestionEnded {
    questionEnded {
      ...RoundFields
    }
  }
  ${ROUND_FIELDS}
`;

export const SCOREBOARD_UPDATED = gql`
  subscription OnScoreboardUpdated {
    scoreboardUpdated {
      twitchUserId
      displayName
      score
    }
  }
`;
