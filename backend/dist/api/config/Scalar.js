"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dateType = exports.Any = void 0;
const graphql_1 = require("graphql");
const nexus_1 = require("nexus");
exports.Any = (0, nexus_1.scalarType)({
    name: 'Any',
    description: 'For anything to not lock yourself in strict types',
    parseValue(value) {
        return value;
    },
    serialize(value) {
        return value;
    }
});
exports.dateType = (0, nexus_1.scalarType)({
    name: 'Date',
    description: 'For representing data in ISO format',
    parseValue(value) {
        return new Date(value);
    },
    serialize(value) {
        return value.getTime(value);
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.INT) {
            return new Date(ast.value);
        }
        return null;
    },
});
//# sourceMappingURL=Scalar.js.map