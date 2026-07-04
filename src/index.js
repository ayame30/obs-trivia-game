import 'dotenv/config';
import http from 'http';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import { chatMonitor, restoreActiveRoundCountdown } from './twitch/chatMonitor.js';
import { getTwitchAccessToken } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.join(__dirname, '../frontend/dist');

const PORT = Number(process.env.PORT) || 4000;

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();
const httpServer = http.createServer(app);

const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

const serverCleanup = useServer({ schema }, wsServer);

const apolloServer = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

await apolloServer.start();

app.use(
  '/graphql',
  cors({ origin: true }),
  bodyParser.json(),
  expressMiddleware(apolloServer)
);

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    twitchChat: chatMonitor.isConnected(),
  });
});

app.use(express.static(frontendDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/graphql') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next(err);
  });
});

await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));

const base = `http://localhost:${PORT}`;
console.log(chalk.green('--------------------------------'));
console.log(chalk.green('Successfully started Stream Trivia app'));
console.log(chalk.green('--------------------------------'));
console.log(chalk.green(`Stream Trivia app: ${base}`));
console.log(chalk.green(`Overlays: http://localhost:${PORT}/overlay`));
console.log(chalk.green(`Scoreboard Overlays: http://localhost:${PORT}/scoreboard-overlay`));
console.log(chalk.blue('--------------------------------'));

import { getScoreboard } from './db.js';

// Print current scoreboard when the server starts
const scoreboard = getScoreboard();
if (scoreboard.length === 0) {
  console.log(chalk.yellow('Scoreboard is empty.'));
} else {
  console.log(chalk.cyan('Current Scoreboard:'));
  scoreboard
    .sort((a, b) => b.score - a.score)
    .forEach((entry, idx) => {
      console.log(
        chalk.whiteBright(
          `${idx + 1}. ${entry.display_name} (${entry.twitch_user_id}): ${entry.score} points`
        )
      );
    });
}

console.log(chalk.grey('--------------------------------'));
console.log(chalk.grey(`To stop the server, press Ctrl+C`));

if (getTwitchAccessToken()) {
  await chatMonitor.connect();
  restoreActiveRoundCountdown();
}
