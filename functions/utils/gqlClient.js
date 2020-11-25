import { request, gql } from 'graphql-request'

// Use GraphQL to update the database
const client = new request.GraphQLClient(
  'https://apt-chamois-59.hasura.app/v1/graphql',
  {
    headers: {
      "content-type": "application/json",
      "x-hasura-admin-secret": "g0GcaF5ia2@4Ir",
    },
  }
);

module.exports = client