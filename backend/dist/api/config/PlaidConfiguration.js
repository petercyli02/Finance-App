"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.plaidClient = exports.plaidRequest = exports.configuration = void 0;
const plaid_1 = require("plaid");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.configuration = new plaid_1.Configuration({
    basePath: plaid_1.PlaidEnvironments.sandbox,
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': process.env.PLAIDCLIENTID,
            'PLAID-SECRET': process.env.PLAIDSECRET,
        },
    },
});
exports.plaidRequest = {
    user: {
        client_user_id: "1", // wait maybe this wont work 
    },
    client_name: 'Plaid Test App',
    products: ['auth', 'transactions'],
    language: 'en',
    redirect_uri: 'http://localhost:3000/', //make sure this is localhost 3000 for the frontend 
    country_codes: ['GB'],
};
exports.plaidClient = new plaid_1.PlaidApi(exports.configuration);
//# sourceMappingURL=PlaidConfiguration.js.map