import { createClient } from 'graphql-ws';
import WebSocket from 'ws';

const url = process.env.WS_URL || 'ws://localhost:4000/graphql';

const client = createClient({
  url,
  webSocketImpl: WebSocket,
});

const query = `subscription { voteCountsUpdated { A B C D total } }`;

console.log('Connecting to', url);

client.subscribe({ query }, {
  next: (msg) => console.log('NEXT', JSON.stringify(msg)),
  error: (e) => {
    console.error('ERR', e);
    process.exit(1);
  },
  complete: () => console.log('COMPLETE'),
});

setTimeout(() => {
  console.log('Still listening (no events unless votes occur). Connection OK if no ERR above.');
  client.dispose();
  process.exit(0);
}, 2000);
