# Obs Trivia game

Apollo Server + SQLite backend for Twitch chat trivia: ABCD questions, live vote counts, scoreboard, and GraphQL subscriptions.

React frontend (`frontend/`) uses Apollo Client 4 with `graphql-ws` subscriptions.

## Setup

### Backend

```bash
cd stream-trivia
cp .env.example .env
# Set TWITCH_CLIENT_ID (same as React app) in .env
npm install
npm run dev
```

Build the frontend, then the backend serves it at the site root (same port as GraphQL):

```bash
cd frontend
cp .env.example .env
# VITE_TWITCH_CLIENT_ID — same Twitch app as backend
npm install
npm run build
cd ..
npm run build:start
# or: npm run build && npm start
```

App (dashboard): `http://localhost:4000/`  
OBS overlay (transparent): `http://localhost:4000/overlay`  
Twitch OAuth: `http://localhost:4000/auth`  
GraphQL: `http://localhost:4000/graphql`  
WebSocket subscriptions: `ws://localhost:4000/graphql`

### Frontend dev (optional)

For hot reload during UI work, run the API (`npm run dev` in project root) and Vite in another terminal:

```bash
cd frontend && npm run dev
```

Vite proxies `/graphql` to the backend. Dashboard: `http://localhost:3001`

## Twitch OAuth

Save the broadcaster OAuth token (from your existing Twitch login flow):

```graphql
mutation {
  setTwitchToken(
    accessToken: "YOUR_OAUTH_TOKEN"
    channel: "your_channel_login"
  ) {
    login
    channel
    hasToken
  }
}
```

Chat is monitored on that channel. Viewers vote by sending **A**, **B**, **C**, or **D** (or `!A`, etc.) — one vote per user per round.

## Questions

```graphql
mutation {
  createQuestion(input: {
    text: "What is 2+2?"
    optionA: "3"
    optionB: "4"
    optionC: "5"
    optionD: "6"
    correctAnswer: B
  }) {
    id
    correctAnswer
  }
}
```

## Live round

```graphql
# Start — subscribers receive questionStarted (correctAnswer hidden)
mutation { startQuestion(questionId: "1") { id question { text optionA } } }

# Stop — reveals answer, updates scoreboard, fires questionEnded + scoreboardUpdated
mutation { stopQuestion { id question { correctAnswer } voteCounts { A B C D total } } }
```

## Subscriptions (frontend)

```graphql
subscription {
  questionStarted {
    id
    startedAt
    question { text optionA optionB optionC optionD }
    voteCounts { A B C D total }
  }
}

subscription {
  voteCountsUpdated { A B C D total }
}

subscription {
  questionEnded {
    id
    question { correctAnswer }
    voteCounts { A B C D total }
  }
}

subscription {
  scoreboardUpdated {
    displayName
    score
  }
}
```

Correct answers award +1 point on `stopQuestion`. Use `resetScoreboard` to clear scores.

Batch manual adjustments (publishes `scoreboardUpdated`):

```graphql
mutation {
  updateScoreboard(updates: [
    { twitchUserId: "12345", delta: 5 }
    { twitchUserId: "67890", score: 10 }
  ]) {
    twitchUserId
    displayName
    score
  }
}
```

Each item must include **exactly one** of `score` (set absolute value) or `delta` (add/subtract). Only existing scoreboard rows can be updated; unknown `twitchUserId` values are rejected. Scores never go below 0.

Use `resetRounds` to clear all rounds/votes and reset the round counter (next round starts at #1). Active rounds are cancelled without awarding points.
