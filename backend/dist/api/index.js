"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
// api/server.ts
const server_1 = require("@apollo/server");
const context_1 = require("./context");
const schema_1 = require("./schema");
const standalone_1 = require("@apollo/server/standalone");
exports.server = new server_1.ApolloServer({
    schema: schema_1.schema,
});
const startServer = async () => {
    const { url } = await (0, standalone_1.startStandaloneServer)(exports.server, {
        context: async function ({ req }) {
            const token = req.headers.authorization || '';
            // then check the validity of this token with firebase
            return {
                db: context_1.context.db,
            };
        }
    });
    console.log(`🚀  Server ready at ${url}`);
};
startServer();
//# sourceMappingURL=index.js.map