import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { OperationTypeNode } from 'graphql';

const httpUri = import.meta.env.VITE_GRAPHQL_HTTP || '/graphql';

function resolveWsUri() {
  if (import.meta.env.VITE_GRAPHQL_WS) {
    return import.meta.env.VITE_GRAPHQL_WS;
  }
  if (typeof window === 'undefined') {
    return 'ws://localhost:4000/graphql';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/graphql`;
}

const wsUri = resolveWsUri();

const httpLink = new HttpLink({ uri: httpUri });

const wsLink = new GraphQLWsLink(
  createClient({
    url: wsUri,
    retryAttempts: Infinity,
    shouldRetry: () => true,
    on: {
      connected: () => console.info('[graphql-ws] connected', wsUri),
      closed: () => console.warn('[graphql-ws] closed'),
      error: (err) => console.error('[graphql-ws] error', err),
    },
  })
);

const splitLink = ApolloLink.split(
  ({ operationType }) => operationType === OperationTypeNode.SUBSCRIPTION,
  wsLink,
  httpLink
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
