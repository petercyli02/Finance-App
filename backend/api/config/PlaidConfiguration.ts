import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Products } from 'plaid'
import dotenv from 'dotenv'
dotenv.config()

export const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAIDCLIENTID,
      'PLAID-SECRET': process.env.PLAIDSECRET,
    },
  },
});

export const plaidRequest = {
  user: {
    client_user_id: "1", // wait maybe this wont work 
  },
  client_name: 'Plaid Test App',
  products: ['auth', 'transactions'] as Products[],
  language: 'en',
  redirect_uri: process.env.FRONTEND_URL, //make sure this is localhost 3000 for the frontend 
  country_codes: ['GB'] as CountryCode[],
};

export const plaidClient = new PlaidApi(configuration);
