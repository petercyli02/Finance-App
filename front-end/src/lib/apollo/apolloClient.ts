import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

function createApolloClient() {
  const client = new ApolloClient({
    link: new HttpLink({
      uri: `http://finapp.us-east-1.elasticbeanstalk.com/graphql`,
    }),
    cache: new InMemoryCache(),
  });
  return client
}

export default createApolloClient;