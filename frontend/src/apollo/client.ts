import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { OperationTypeNode } from 'graphql';

const httpUri = import.meta.env.VITE_GRAPHQL_HTTP || '/graphql';

/** Dispatched on `window` when the GraphQL WS link connects or closes. */
export const GRAPHQL_WS_STATUS_EVENT = 'obs-trivia:graphql-ws-status';

export type GraphqlWsStatusDetail = { status: 'connected' | 'closed' };

function resolveWsUri(): string {
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

function emitWsStatus(status: GraphqlWsStatusDetail['status']) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<GraphqlWsStatusDetail>(GRAPHQL_WS_STATUS_EVENT, { detail: { status } })
  );
}

const wsLink = new GraphQLWsLink(
  createClient({
    url: wsUri,
    lazy: false,
    retryAttempts: Infinity,
    shouldRetry: () => true,
    retryWait: async (retries) => {
      const ms = Math.min(1000 * 2 ** retries, 14000);
      await new Promise((resolve) => setTimeout(resolve, ms));
    },
    on: {
      connected: () => {
        console.info('[graphql-ws] connected', wsUri);
        emitWsStatus('connected');
      },
      closed: () => {
        console.warn('[graphql-ws] closed');
        emitWsStatus('closed');
      },
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
  cache: new InMemoryCache({
    typePolicies: {
      Question: {
        fields: {
          // Live rounds hide the answer (null) until reveal; don't wipe bank cache.
          correctAnswer: {
            merge(existing: string | null | undefined, incoming: string | null | undefined) {
              if ((incoming === null || incoming === undefined) && existing != null) {
                return existing;
              }
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
