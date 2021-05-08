import { Client } from '@urql/core';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { OperationContext, OperationResult } from '@urql/core/dist/types/types';

type Queries = {
  queries?: {
    [key: string]: TypedDocumentNode<any, object> | string;
  };
  mutations?: {
    [key: string]: TypedDocumentNode<any, object> | string;
  };
};

export type Graphql<T extends Queries> = {
  initialize(client: Client): void;
} & {
  queries: {
    [N in keyof T['queries']]: T['queries'][N] extends (
      variables: infer V,
      context: infer C
    ) => infer R
      ? V extends void
        ? C extends void
          ? () => Promise<R>
          : (variables: V, context: C) => Promise<R>
        : C extends void
        ? (variables: V) => Promise<R>
        : (variables: V, context: C) => Promise<R>
      : never;
  };
  mutations: {
    [N in keyof T['mutations']]: T['mutations'][N] extends (
      variables: infer V,
      context: infer C
    ) => infer R
      ? V extends void
        ? C extends void
          ? () => Promise<R>
          : (variables: V, context: C) => Promise<R>
        : C extends void
        ? (variables: V) => Promise<R>
        : (variables: V, context: C) => Promise<R>
      : never;
  };
};

function createError(message: string) {
  throw new Error(`OVERMIND-URQL: ${message}`);
}

const _clients: { [url: string]: Client } = {};

export const graphql: <T extends Queries>(
  queries: T
) => Graphql<T> = queries => {
  let _client: Client;

  function getClient(): Client | null {
    if (_client) {
      _clients[_client.url] = _client;
      return _client;
    }

    return null;
  }

  const evaluatedQueries = {
    queries: Object.keys(queries.queries || {}).reduce(
      (aggr, key) => {
        aggr[key] = <Data = any, Variables extends object = {}>(
          variables?: Variables,
          context?: Partial<OperationContext>
        ) => {
          const query = queries.queries![key];
          const client = getClient();

          if (client) {
            return client
              .query<Data, Variables>(query, variables, context)
              .toPromise();
          }

          throw createError(
            'You are running a query, though there is no urql client configured'
          );
        };
        return aggr;
      },
      {} as {
        [key: string]: <Data = any, Variables extends object = {}>(
          variables?: Variables,
          context?: Partial<OperationContext>
        ) => Promise<OperationResult<Data, Variables>>;
      }
    ),
    mutations: Object.keys(queries.mutations || {}).reduce(
      (aggr, key) => {
        aggr[key] = <Data = any, Variables extends object = {}>(
          variables?: Variables,
          context?: Partial<OperationContext>
        ) => {
          const query = queries.mutations![key];
          const client = getClient();

          if (client) {
            return client
              .mutation<Data, Variables>(query, variables, context)
              .toPromise();
          }

          throw createError(
            'You are running a mutation query, though there is no urql client configured'
          );
        };
        return aggr;
      },
      {} as {
        [key: string]: <Data = any, Variables extends object = {}>(
          variables?: Variables,
          context?: Partial<OperationContext>
        ) => Promise<OperationResult<Data, Variables>>;
      }
    ),
  };

  return {
    initialize(client: Client) {
      _client = client;
    },
    ...evaluatedQueries,
  } as any;
};

export * from '@urql/core';
