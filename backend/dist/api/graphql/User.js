"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserMutation = exports.UserQuery = exports.User = void 0;
const nexus_1 = require("nexus");
const client_s3_1 = require("@aws-sdk/client-s3");
const S3Bucket_1 = require("../config/S3Bucket");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const bucketRegion = process.env.BUCKET_REGION;
const bucketName = process.env.PFP_BUCKET_NAME;
exports.User = (0, nexus_1.objectType)({
    name: "User",
    definition(t) {
        t.nonNull.int("id");
        t.string("firstName");
        t.string("lastName");
        t.nonNull.string("username");
        t.nonNull.string("email");
        t.string("phone");
        t.nonNull.string("uid");
        t.list.nonNull.field("Transactions", { type: "Transaction" });
        t.list.nonNull.field("Accounts", { type: "Account" });
        t.string("accessToken");
        t.string("profilePictureUrl");
    },
});
exports.UserQuery = (0, nexus_1.extendType)({
    type: "Query",
    definition(t) {
        t.nonNull.list.nonNull.field("getAllUsers", {
            type: "User",
            async resolve(_root, _args, ctx) {
                const users = await ctx.db.user.findMany({
                    include: {
                        Transactions: true,
                        Accounts: true,
                    },
                });
                return users;
            },
        });
        t.nonNull.field("getUserByUid", {
            type: "User",
            args: {
                uid: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
            },
            async resolve(_root, args, ctx) {
                const user = await ctx.db.user.findUnique({
                    where: { uid: args.uid },
                    include: {
                        Transactions: true,
                        Accounts: true,
                    },
                });
                if (!user) {
                    throw new Error(`No user with uid ${args.uid} found.`);
                }
                return user;
            },
        });
        /**
         * @param userId : an Integer that is the id of the user you wish to get access token for
         *
         * The idea of this query is to decrease the number of queries that you would need to make to the plaidAPI
         */
        t.field("getUserById", {
            type: "User",
            args: {
                userId: (0, nexus_1.nonNull)((0, nexus_1.intArg)()),
            },
            async resolve(_root, args, ctx) {
                const user = await ctx.db.user.findUnique({
                    where: {
                        id: args.userId,
                    },
                });
                if (!user) {
                    throw new Error(`No user found with ID ${args.userId}`);
                }
                return user;
            },
        });
        t.boolean("usernameExists", {
            args: {
                username: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
            },
            resolve: async (_coerceToDict, args, ctx) => {
                const user = await ctx.db.user.findUnique({
                    where: {
                        username: args.username,
                    },
                    select: {
                        id: true,
                    },
                });
                if (!user) {
                    return false;
                }
                return true;
            },
        });
    },
});
exports.UserMutation = (0, nexus_1.extendType)({
    type: "Mutation",
    definition(t) {
        t.nonNull.field("createUser", {
            type: "User",
            args: {
                firstName: (0, nexus_1.stringArg)(),
                lastName: (0, nexus_1.stringArg)(),
                username: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
                email: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
                uid: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
                phone: (0, nexus_1.stringArg)(),
            },
            resolve: async (_root, args, ctx) => {
                return await ctx.db.user.create({
                    data: {
                        firstName: args.firstName,
                        lastName: args.lastName,
                        username: args.username,
                        email: args.email,
                        uid: args.uid,
                        phone: args.phone,
                    },
                    include: {
                        Transactions: true,
                    },
                });
            },
        });
        t.nonNull.field("updateUserDetails", {
            type: "User",
            args: {
                id: (0, nexus_1.nonNull)((0, nexus_1.intArg)()),
                firstName: (0, nexus_1.stringArg)(),
                lastName: (0, nexus_1.stringArg)(),
                username: (0, nexus_1.stringArg)(),
                email: (0, nexus_1.stringArg)(),
                uid: (0, nexus_1.stringArg)(),
                phone: (0, nexus_1.stringArg)(),
            },
            resolve: async (_root, args, ctx) => {
                return ctx.db.user.update({
                    where: { id: args.id },
                    data: {
                        firstName: args.firstName,
                        lastName: args.lastName,
                        username: args.username ?? undefined,
                        email: args.email ?? undefined,
                        uid: args.uid ?? undefined,
                    },
                    include: {
                        Transactions: true,
                    },
                });
            },
        });
        t.nonNull.field("deleteUser", {
            type: "User",
            args: {
                id: (0, nexus_1.nonNull)((0, nexus_1.intArg)()),
            },
            resolve(_root, args, ctx) {
                return ctx.db.user.delete({
                    where: { id: args.id },
                    include: {
                        Transactions: true,
                    },
                });
            },
        });
        t.nonNull.string("getUploadSignedUrl", {
            args: {
                userId: (0, nexus_1.nonNull)((0, nexus_1.intArg)()),
            },
            resolve: async (_root, args, ctx) => {
                try {
                    await S3Bucket_1.s3.send(new client_s3_1.GetObjectCommand({
                        Bucket: bucketName,
                        Key: String(args.userId),
                    }));
                    const response = await S3Bucket_1.s3.send(new client_s3_1.DeleteObjectCommand({
                        Bucket: bucketName,
                        Key: String(args.userId),
                    }));
                    console.log("Deleted object:", { response });
                }
                catch (caught) {
                    if (caught instanceof client_s3_1.NoSuchKey) {
                        console.log("User has no existing profile picture");
                    }
                }
                finally {
                    await ctx.db.user.update({
                        where: { id: args.userId },
                        data: {
                            profilePictureUrl: `https://finapp-pfp.s3.${bucketRegion}.amazonaws.com/${args.userId}?${new Date().getTime()}`,
                        }
                    });
                    const putCommand = new client_s3_1.PutObjectCommand({
                        Bucket: bucketName,
                        Key: String(args.userId),
                    });
                    const url = await (0, s3_request_presigner_1.getSignedUrl)(S3Bucket_1.s3, putCommand, { expiresIn: 3600 });
                    return url;
                }
            },
        });
    },
});
//# sourceMappingURL=User.js.map