"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaidMutations = exports.TransactionRes = exports.Counterparty = exports.Location = exports.PaymentMeta = exports.PersonalFinanceCategory = exports.Item = exports.AccessToken = exports.LinkToken = void 0;
const plaid_1 = require("plaid");
const PlaidConfiguration_1 = require("../../config/PlaidConfiguration");
const nexus_1 = require("nexus");
const plaidClient = new plaid_1.PlaidApi(PlaidConfiguration_1.configuration);
exports.LinkToken = (0, nexus_1.objectType)({
    name: "LinkToken",
    definition(t) {
        t.string("link_token");
        t.string("expiration");
        t.string("request_id");
    },
});
exports.AccessToken = (0, nexus_1.objectType)({
    name: "AccessToken",
    definition(t) {
        t.string("accessToken");
        t.string("item_id");
        t.string("request_id");
    },
});
exports.Item = (0, nexus_1.objectType)({
    name: "Item",
    definition(t) {
        t.list.string("available_products");
        t.list.string("billed_products");
        t.nullable.string("consent_expiration_time");
        t.nullable.string("error");
        t.string("institution_id");
        t.string("institution_name");
        t.string("item_id");
        t.string("update_type");
        t.string("webhook");
        t.string("auth_method");
    },
});
exports.PersonalFinanceCategory = (0, nexus_1.objectType)({
    name: "PersonalFinanceCategory",
    definition(t) {
        t.string("primary");
        t.string("detailed");
        t.string("confidence_level");
    },
});
exports.PaymentMeta = (0, nexus_1.objectType)({
    name: "PaymentMeta",
    definition(t) {
        t.nullable.string("by_order_of");
        t.nullable.string("payee");
        t.nullable.string("payer");
        t.nullable.string("payment_method");
        t.nullable.string("payment_processor");
        t.nullable.string("ppd_id");
        t.nullable.string("reason");
        t.nullable.string("reference_number");
    },
});
exports.Location = (0, nexus_1.objectType)({
    name: "Location",
    definition(t) {
        t.nullable.string("address");
        t.nullable.string("city");
        t.nullable.string("region");
        t.nullable.string("postal_code");
        t.nullable.string("country");
        t.nullable.float("lat");
        t.nullable.float("lon");
        t.nullable.string("store_number");
    },
});
exports.Counterparty = (0, nexus_1.objectType)({
    name: "Counterparty",
    definition(t) {
        t.string("name");
        t.string("type");
        t.string("logo_url");
        t.string("website");
        t.string("entity_id");
        t.string("confidence_level");
    },
});
exports.TransactionRes = (0, nexus_1.objectType)({
    name: "TransactionRes",
    definition(t) {
        t.list.field("accounts", {
            type: "Account",
        });
        t.list.field("transactions", {
            type: "Transaction",
        });
        t.field("item", {
            type: "Item",
        });
        t.int("total_transactions");
        t.string("request_id");
    },
});
// https://plaid.com/docs/api/products/transactions/#transactionsget refer back to this api doc to see the response and request fields required
/**
 * @param userId : an Integer that is the id of the user you wish to get access token for
 *
 * The idea of this query is to decrease the number of queries that you would need to make to the plaidAPI
 */
exports.PlaidMutations = (0, nexus_1.extendType)({
    type: "Mutation",
    definition(t) {
        t.field("createLinkToken", {
            type: "LinkToken",
            async resolve(_root, args, ctx) {
                try {
                    const plaidRequest = {
                        user: {
                            client_user_id: "26",
                        },
                        client_name: "Plaid Test App",
                        products: ["auth", "transactions"],
                        language: "en",
                        redirect_uri: "http://localhost:3000/", // make sure this is localhost 3000 for the frontend
                        country_codes: ["GB"],
                    };
                    const createTokenResponse = await plaidClient.linkTokenCreate(plaidRequest);
                    return {
                        link_token: createTokenResponse.data.link_token,
                        expiration: createTokenResponse.data.expiration,
                        request_id: createTokenResponse.data.request_id,
                    };
                }
                catch (error) {
                    console.error("Error creating link token:", error);
                    throw new Error("Failed to create link token");
                }
            },
        });
        t.nonNull.string("exchangePublicToken", {
            args: {
                userId: (0, nexus_1.nonNull)((0, nexus_1.intArg)()),
                public_token: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
            },
            async resolve(_root, args, ctx) {
                const publicToken = args.public_token;
                const user = await ctx.db.user.findUnique({
                    where: { id: args.userId },
                });
                if (!user) {
                    throw new Error("User not found");
                }
                const plaidResponse = await plaidClient.itemPublicTokenExchange({
                    public_token: args.public_token,
                });
                const accessToken = plaidResponse.data.access_token;
                const itemId = plaidResponse.data.item_id;
                const requestId = plaidResponse.data.request_id;
                await ctx.db.user.update({
                    where: {
                        id: args.userId,
                    },
                    data: {
                        AccessToken: accessToken,
                    },
                });
                return accessToken;
            },
        });
    },
});
//# sourceMappingURL=Plaid.js.map