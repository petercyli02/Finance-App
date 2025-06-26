import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

function createApolloClient() {
  const client = new ApolloClient({
    link: new HttpLink({
      uri: `http://ec2-44-207-3-77.compute-1.amazonaws.com:4000/graphql`,
    }),
    cache: new InMemoryCache(),
  });
  return client
}

export default createApolloClient;