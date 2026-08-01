export const typeDefs = `#graphql
  enum AnswerChoice {
    A
    B
    C
    D
  }

  enum RoundStatus {
    active
    ended
  }

  type Question {
    id: ID!
    text: String!
    optionA: String!
    optionB: String!
    optionC: String!
    optionD: String!
    correctAnswer: AnswerChoice
    countdownSeconds: Int!
    createdAt: String
  }

  type VoteCounts {
    A: Int!
    B: Int!
    C: Int!
    D: Int!
    total: Int!
  }

  type Round {
    id: ID!
    questionId: ID!
    status: RoundStatus!
    startedAt: String!
    endedAt: String
    question: Question!
    voteCounts: VoteCounts!
    countdownSeconds: Int!
    countdownRemainingSeconds: Int!
    countdownPaused: Boolean!
    countdownEndsAt: String
  }

  type TwitchConfig {
    login: String!
    userId: String!
    channel: String!
    updatedAt: String!
    hasToken: Boolean!
  }

  type ScoreboardEntry {
    twitchUserId: String!
    displayName: String!
    score: Int!
  }

  input CreateQuestionInput {
    text: String!
    optionA: String!
    optionB: String!
    optionC: String!
    optionD: String!
    correctAnswer: AnswerChoice!
    countdownSeconds: Int
  }

  input UpdateQuestionInput {
    text: String
    optionA: String
    optionB: String
    optionC: String
    optionD: String
    correctAnswer: AnswerChoice
    countdownSeconds: Int
  }

  """Set absolute score or apply a delta for one scoreboard row."""
  input ScoreboardUpdateInput {
    twitchUserId: String!
    displayName: String
    score: Int
    delta: Int
  }

  type Query {
    questions: [Question!]!
    question(id: ID!): Question
    activeRound: Round
    twitchConfig: TwitchConfig
    scoreboard: [ScoreboardEntry!]!
  }

  type Mutation {
    createQuestion(input: CreateQuestionInput!): Question!
    updateQuestion(id: ID!, input: UpdateQuestionInput!): Question
    deleteQuestion(id: ID!): Boolean!
    setTwitchToken(accessToken: String!, channel: String): TwitchConfig!
    startQuestion(questionId: ID!): Round!
    stopQuestion: Round!
    pauseCountdown: Round!
    resumeCountdown: Round!
    resetScoreboard: [ScoreboardEntry!]!
    updateScoreboard(updates: [ScoreboardUpdateInput!]!): [ScoreboardEntry!]!
    resetRounds: Boolean!
    reconnectTwitchChat: Boolean!
  }

  type Subscription {
    questionStarted: Round!
    voteCountsUpdated: VoteCounts!
    countdownUpdated: Round!
    questionEnded: Round!
    scoreboardUpdated: [ScoreboardEntry!]!
    roundsReset: Boolean!
  }
`;
