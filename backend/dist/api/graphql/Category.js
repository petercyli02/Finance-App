"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryMutation = exports.CategoryQuery = exports.Category = void 0;
const nexus_1 = require("nexus");
exports.Category = (0, nexus_1.objectType)({
    name: "Category",
    definition(t) {
        t.nonNull.int("id");
        t.nonNull.string("name");
        t.string("description");
        t.int("userId");
        t.field("User", {
            type: "User",
        });
        t.string("colour");
        t.list.nonNull.field("Transactions", {
            type: "Transaction",
        });
    },
});
exports.CategoryQuery = (0, nexus_1.extendType)({
    type: "Query",
    definition(t) {
        t.nonNull.field("getCategoryById", {
            type: "Category",
            args: {
                id: (0, nexus_1.nonNull)((0, nexus_1.intArg)()),
            },
            resolve: async (_root, args, ctx) => {
                const category = await ctx.db.category.findFirstOrThrow({
                    where: {
                        id: args.id,
                    },
                });
                return category;
            }
        });
        t.nonNull.list.nonNull.field("getCategoriesByUserId", {
            type: "Category",
            args: {
                userId: (0, nexus_1.nonNull)((0, nexus_1.intArg)()),
            },
            resolve: async (_root, args, ctx) => {
                const categories = await ctx.db.category.findMany({
                    where: {
                        userId: args.userId,
                    },
                    include: {
                        User: true,
                        Transactions: true,
                    },
                });
                if (!categories) {
                    throw new Error("Error fetching categories!");
                }
                return categories;
            },
        });
    },
});
exports.CategoryMutation = (0, nexus_1.extendType)({
    type: "Mutation",
    definition(t) {
        t.nonNull.field("createCategory", {
            type: "Category",
            args: {
                name: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
                userId: (0, nexus_1.nonNull)((0, nexus_1.intArg)()),
                description: (0, nexus_1.stringArg)(),
            },
            resolve: async (_root, args, ctx) => {
                const category = await ctx.db.category.create({
                    data: {
                        name: args.name,
                        description: args.description,
                        User: {
                            connect: {
                                id: args.userId,
                            },
                        },
                    },
                    include: {
                        User: true,
                    },
                });
                if (!category) {
                    throw new Error("Error: Unable to create new category");
                }
                return category;
            },
        });
        t.nonNull.field("deleteCategory", {
            type: "Category",
            args: {
                id: (0, nexus_1.nonNull)((0, nexus_1.intArg)()),
            },
            resolve: async (_root, args, ctx) => {
                const category = await ctx.db.category.delete({
                    where: {
                        id: args.id,
                    },
                    include: {
                        User: true,
                    },
                });
                if (!category) {
                    throw new Error(`Error: Unable to delete the category with id ${args.id}`);
                }
                return category;
            },
        });
        t.nonNull.field("updateCategory", {
            type: "Category",
            args: {
                id: (0, nexus_1.nonNull)((0, nexus_1.intArg)()),
                name: (0, nexus_1.stringArg)(),
                description: (0, nexus_1.stringArg)(),
                colour: (0, nexus_1.stringArg)(),
            },
            resolve: async (_root, args, ctx) => {
                if (!args.name && !args.description && !args.colour) {
                    throw new Error("Error: Please provide at least a name or a description or a colour.");
                }
                const category = await ctx.db.category.update({
                    where: {
                        id: args.id,
                    },
                    data: {
                        ...(args.name && {
                            name: args.name,
                        }),
                        ...(args.description && {
                            description: args.description,
                        }),
                        ...(args.colour && {
                            colour: args.colour,
                        })
                    },
                    include: {
                        User: true,
                    },
                });
                if (!category) {
                    throw new Error(`Error: Unable to update the category with id ${args.id}`);
                }
                return category;
            },
        });
    },
});
//# sourceMappingURL=Category.js.map