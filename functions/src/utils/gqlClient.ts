import { GraphQLClient as ClientGenerator} from 'graphql-request'

// Use GraphQL to update the database
export const graphQLClient = new ClientGenerator('https://apt-chamois-59.hasura.app/v1/graphql', {
  headers: {
    'content-type': 'application/json',
    'x-hasura-admin-secret': 'g0GcaF5ia2@4Ir',
  },
});
