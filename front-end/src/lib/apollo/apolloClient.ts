import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

function createApolloClient() {
  const client = new ApolloClient({
    link: new HttpLink({
      uri: `${process.env.NEXT_SERVER_URL}git adgraphql`,
    }),
    cache: new InMemoryCache(),
  });
  return client
}

export default createApolloClient;