# Obs Trivia game

Twitch chat trivia with live OBS overlays (ABCD votes, scoreboard, countdown).

## Contents

1. [For streamers (no coding)](#for-streamers-no-coding)
2. [Screenshots](#screenshots)
3. [For developers](#for-developers)
   - [Requirements](#requirements)
   - [Setup](#setup)
   - [Run API only](#run-api-only)
   - [Build UI + API, then start](#build-ui--api-then-start)
   - [Frontend hot reload](#frontend-hot-reload-optional)
   - [Overlay CSS + MCP](#overlay-css-file-split--mcp)
   - [Electron desktop app](#electron-desktop-app)
   - [GitHub Releases](#github-releases)
4. [Twitch chat votes](#twitch-chat-votes)
5. [GraphQL (developers)](#graphql-developers)
   - [Questions](#questions)
   - [Live round](#live-round)
   - [Subscriptions](#subscriptions)
6. [License](#license)

---

## For streamers (no coding)

1. Download the Windows installer (`ObsTriviaGame-*-x64.exe`).
2. Install / double-click to open **Obs Trivia game**.
3. Sign in with Twitch in the app and finish the setup steps.
4. In OBS or Streamlabs, add **Browser Sources**:
   - Trivia overlay: [http://localhost:4000/overlay/questions](http://localhost:4000/overlay/questions)
   - Scoreboard: [http://localhost:4000/overlay/scoreboard](http://localhost:4000/overlay/scoreboard)
5. Keep the app **running** while you stream.

To stop: close the app window.

If Windows SmartScreen appears, choose **More info** → **Run anyway**.

---

## Screenshots

![Obs Trivia game dashboard](docs/images/screencap.png)

---

## For developers

### Requirements

- Node.js 22.5+

### Setup

```bash
cp .env.example .env
# Set TWITCH_CLIENT_ID

cd frontend
cp .env.example .env
# Set VITE_TWITCH_CLIENT_ID (same value)
npm install
cd ..
npm install
```

### Run API only

```bash
npm run dev
```

### Build UI + API, then start

```bash
npm run build:start
```

| Surface | URL |
|---------|-----|
| App | [http://localhost:4000/](http://localhost:4000/) |
| Trivia overlay | [http://localhost:4000/overlay/questions](http://localhost:4000/overlay/questions) |
| Scoreboard overlay | [http://localhost:4000/overlay/scoreboard](http://localhost:4000/overlay/scoreboard) |
| Twitch OAuth redirect | [http://localhost:4000/](http://localhost:4000/) (register this URI on your Twitch app) |
| Overlay CSS + Question CRUD MCP | [http://localhost:4000/mcp](http://localhost:4000/mcp) (`POST`) |

### Frontend hot reload (optional)

```bash
# terminal 1
npm run dev

# terminal 2
cd frontend && npm run dev
```

Vite proxies `/graphql` to the API. UI: [http://localhost:3001](http://localhost:3001)  
OAuth still redirects to port **4000** when using Vite (see `VITE_TWITCH_REDIRECT_ORIGIN`).

### Overlay CSS (file split + MCP)

| File | Role |
|------|------|
| [`frontend/src/styles/dashboard.css`](frontend/src/styles/dashboard.css) | App chrome |
| [`frontend/src/styles/overlay.css`](frontend/src/styles/overlay.css) | OBS overlays |
| [`frontend/src/styles/base.css`](frontend/src/styles/base.css) | Shared tokens / forms |
| [`frontend/src/styles/global.css`](frontend/src/styles/global.css) | Imports the three above |

Custom CSS is editable in **Settings → Overlay custom CSS**, or via MCP on the running API (`POST` [http://localhost:4000/mcp](http://localhost:4000/mcp)).

### Electron desktop app

```bash
# Dev: builds server+UI, opens Electron window
npm run electron:dev

# Windows NSIS installer → release/
npm run dist:win
```

`dist:win` packs Nest + production `node_modules` into `electron-resources/server` (pruned), keeps only the `en-US` Electron locale, then builds an NSIS installer. Expect roughly **~90–110 MB** for the `.exe` — most of that is Chromium inside Electron; the Nest server payload is trimmed separately.

## Twitch chat votes

Viewers vote by sending **A**, **B**, **C**, or **D** (or `!A`, etc.) — one vote per user per round.

## GraphQL (developers)

### Questions

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

### Live round

```graphql
mutation { startQuestion(questionId: "1") { round { id } warning } }

mutation { stopQuestion { id question { correctAnswer } voteCounts { A B C D total } } }
```

### Subscriptions

```graphql
subscription {
  questionStarted {
    id
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

Each item must include **exactly one** of `score` or `delta`. Scores never go below 0.

Use `resetRounds` to clear rounds/votes and reset the round counter.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only).
