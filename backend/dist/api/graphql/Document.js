"use strict";
/**
 * allow for the upload of documents from the front-end
 * allow for the analysis fo rdocuments on the backend
 * allow for download of documents to the front-end
 * allow for storage of files on s3 buckets
 *
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentQueries = exports.DocumentMutation = exports.s3Object = exports.Document = void 0;
const nexus_1 = require("nexus");
const client_s3_1 = require("@aws-sdk/client-s3");
const S3Bucket_1 = require("../config/S3Bucket");
const crypto = __importStar(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_s3_2 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const fs = __importStar(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const os_1 = __importDefault(require("os"));
const google_genai_1 = require("@langchain/google-genai");
const prompts_1 = require("@langchain/core/prompts");
const pdf_1 = require("@langchain/community/document_loaders/fs/pdf");
const textsplitters_1 = require("@langchain/textsplitters");
dotenv_1.default.config();
const bucketName = process.env.DOCUMENT_BUCKET_NAME;
exports.Document = (0, nexus_1.objectType)({
    name: "Document",
    definition(t) {
        t.nonNull.string("key");
        t.nonNull.int("size");
        t.string("name");
        t.nonNull.string("uid");
    },
});
exports.s3Object = (0, nexus_1.objectType)({
    name: "s3Object",
    definition(t) {
        t.nonNull.string("key");
        t.nonNull.string("name");
        t.nonNull.int("size");
        t.nonNull.string("uid");
        t.nonNull.string("file");
        t.string("contentType");
        t.string("lastModified");
    },
});
exports.DocumentMutation = (0, nexus_1.extendType)({
    type: "Mutation",
    definition(t) {
        t.field("uploadPdf", {
            type: "Any",
            args: {
                name: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
                size: (0, nexus_1.nonNull)((0, nexus_1.intArg)()),
                file: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
                uid: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
            },
            async resolve(_root, args, ctx) {
                console.log(args.uid);
                const buffer = Buffer.from(args.file, "base64");
                const randomName = (bytes = 32) => {
                    return crypto.randomBytes(bytes).toString("hex");
                };
                const uniqueName = randomName();
                const params = {
                    Bucket: bucketName,
                    Key: uniqueName,
                    Body: buffer,
                    ContentType: "PDF",
                };
                const command = new client_s3_1.PutObjectCommand(params);
                await S3Bucket_1.s3.send(command);
                const uploadDocument = await ctx.db.document.create({
                    data: {
                        key: uniqueName,
                        name: args.name,
                        size: args.size,
                        uid: args.uid,
                    },
                });
                return uploadDocument;
            },
        });
        t.field("deleteDocumentByKey", {
            type: "Boolean",
            args: {
                documentKey: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
            },
            async resolve(_root, args, ctx) {
                const getObjectParams = {
                    Bucket: bucketName,
                    Key: args.documentKey,
                };
                try {
                    const deleteDataFromS3 = await S3Bucket_1.s3.send(new client_s3_1.DeleteObjectCommand(getObjectParams));
                }
                catch (error) {
                    throw new Error("unable to delete document from s3 bucket");
                }
                try {
                    const pdfToDelete = await ctx.db.document.delete({
                        where: {
                            key: args.documentKey,
                        },
                    });
                    if (!pdfToDelete) {
                        return false;
                    }
                    return true;
                }
                catch (err) {
                    throw new Error("unable to delete the associated pdf record from postgres");
                }
            },
        });
        t.field("deleteAllDocumentsAssociatedWithUserInBucketByUid", {
            type: "Boolean",
            args: {
                uid: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
            },
            async resolve(_root, args, ctx) {
                // TODO:
                // this works but for some reason keeps timing out
                try {
                    console.log("here");
                    const documentArray = await ctx.db.document.findMany({
                        where: {
                            uid: args.uid,
                        },
                    });
                    if (!documentArray || documentArray.length == 0) {
                        return false;
                    }
                    const { Deleted } = await S3Bucket_1.s3.send(new client_s3_1.DeleteObjectsCommand({
                        Bucket: bucketName,
                        Delete: {
                            Objects: documentArray.map((document) => ({
                                Key: document.key,
                            })),
                        },
                    }));
                    console.log(Deleted);
                    if (!Deleted || Deleted.length == 0) {
                        return false;
                    }
                    for (const document in documentArray) {
                        console.log(document);
                        await (0, client_s3_1.waitUntilObjectNotExists)({
                            client: S3Bucket_1.s3,
                            maxWaitTime: 30,
                        }, {
                            Bucket: bucketName,
                            Key: documentArray[document].key,
                        });
                    }
                    await ctx.db.document.deleteMany({
                        where: {
                            uid: args.uid,
                        },
                    });
                    return true;
                }
                catch (err) {
                    console.log(err);
                    throw new Error("unable to delete objects");
                }
            },
        });
        t.field("analyseSinglePdfWithAI", {
            type: "Any",
            args: {
                pdfKey: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
            },
            async resolve(_root, args, ctx) {
                const uniquePdf = await ctx.db.document.findUnique({
                    where: {
                        key: args.pdfKey,
                    },
                });
                if (!uniquePdf) {
                    return false;
                }
                const getObjectParams = {
                    Bucket: bucketName,
                    Key: uniquePdf.key,
                };
                const command = new client_s3_2.GetObjectCommand(getObjectParams);
                const response = await S3Bucket_1.s3.send(command);
                if (!response.Body) {
                    throw new Error("Unable to retrieve s3 object");
                }
                const arrayBuffer = await response.Body.transformToByteArray();
                const buffer = Buffer.from(arrayBuffer);
                const tempDir = os_1.default.tmpdir();
                const tempFilePath = node_path_1.default.join(tempDir, `${uniquePdf.key}.pdf`);
                fs.writeFileSync(tempFilePath, buffer);
                const loader = new pdf_1.PDFLoader(tempFilePath, {
                    splitPages: true,
                });
                const docs = await loader.load();
                const textSplitter = new textsplitters_1.RecursiveCharacterTextSplitter({
                    chunkSize: 1000,
                    chunkOverlap: 200,
                });
                const splitDocs = await textSplitter.splitDocuments(docs);
                const model = new google_genai_1.ChatGoogleGenerativeAI({
                    modelName: "gemini-1.5-pro",
                    maxOutputTokens: 2048,
                    apiKey: process.env.GEMINI_KEY,
                });
                const tableExtractionPrompt = prompts_1.PromptTemplate.fromTemplate(`
                    You are a data extraction specialist. Analyze the following PDF content carefully to identify and extract ALL tables.
                    
                    For each table:
                    1. Extract the column headers
                    2. Extract all data cells
                    3. Convert to a clean JSON format
                    
                    If you encounter any data that looks tabular (even if it's not in a formal table), extract it as well.
                    
                    Here's the PDF content to analyze:
                    
                    {context}
                    
                    Return ONLY the extracted tables in the following structured JSON format:
                    {{
                      "tables": [
                        {{
                          "tableTitle": "title or description of the table",
                          "headers": ["column1", "column2", "column3", ...],
                          "rows": [
                            ["row1cell1", "row1cell2", "row1cell3", ...],
                            ["row2cell1", "row2cell2", "row2cell3", ...],
                            ...
                          ]
                        }},
                        ... additional tables ...
                      ]
                    }}
                    
                    Don't include any explanations, just the JSON data.
                `);
                const chain = tableExtractionPrompt.pipe(model);
                const chunkResultArray = await Promise.all(splitDocs.map(async (doc) => {
                    const test = await chain.invoke({
                        context: doc.pageContent,
                    });
                    return {
                        content: test,
                        pageNumber: doc.metadata?.loc?.pageNumber,
                    };
                }));
                const mergeTablesPrompt = prompts_1.PromptTemplate.fromTemplate(`
                    You are a data integration specialist. Your task is to analyze tables extracted from different chunks of the same PDF document and merge them into a coherent set of complete tables.
                  
                    For each set of table fragments:
                    1. Identify tables that appear to be parts of the same larger table
                    2. Merge partial tables that belong together
                    3. Remove duplicate rows
                    4. Combine headers appropriately
                    5. Ensure consistent formatting across merged tables
                    6. Preserve any table titles or descriptions
                  
                    Here are the extracted tables from different chunks:
                  
                    {context}
                  
                    Please analyze these table fragments and return a complete set of merged tables in the following JSON format:
                    {{
                      "merged tables": [
                        {{
                          "tableTitle": "title or description of the table",
                          "headers": ["column1", "column2", "column3", ...],
                          "rows": [
                            ["row1cell1", "row1cell2", "row1cell3", ...],
                            ["row2cell1", "row2cell2", "row2cell3", ...],
                            ...
                          ]
                        }},
                        ... additional tables ...
                      ]
                    }}
                  
                    For merging logic:
                    - Tables with matching headers should be considered part of the same table
                    - Tables with similar titles should be checked for potential merging
                    - Partial tables that appear to continue from one chunk to another should be joined
                    - If a table spans across page boundaries, ensure rows are in the correct order
                  
                    If you detect any tables that are clearly different entities, keep them separate.
                    Return ONLY the JSON with merged tables without any additional explanations.
                  `);
                const mergeChain = mergeTablesPrompt.pipe(model);
                const mergedTablesResult = await mergeChain.invoke({
                    context: chunkResultArray,
                });
                console.log(mergedTablesResult.content);
                const doesMergedTableExists = await ctx.db.mergedTable.findFirst({
                    where: {
                        documentKey: args.pdfKey,
                    },
                });
                if (!doesMergedTableExists) {
                    await ctx.db.mergedTable.create({
                        data: {
                            documentKey: args.pdfKey,
                            mergedTableContent: mergedTablesResult.content,
                        },
                    });
                }
                else {
                    return {
                        success: true,
                        existAlready: true,
                        mergeTablesPrompt: mergedTablesResult.content,
                        documentInfo: {
                            key: uniquePdf.key,
                            name: uniquePdf.name || "Unnamed document",
                        },
                    };
                }
                try {
                    fs.unlinkSync(tempFilePath);
                }
                catch (error) {
                    console.error("Error removing temp file:", error);
                }
                /**
                 * TODO:
                 * 1. look into using batches to make it better
                 */
                return {
                    success: true,
                    existAlready: false,
                    mergedTables: mergedTablesResult.content,
                    documentInfo: {
                        key: uniquePdf.key,
                        name: uniquePdf.name || "Unnamed document",
                    },
                };
            },
        });
    },
});
exports.DocumentQueries = (0, nexus_1.extendType)({
    type: "Query",
    definition(t) {
        t.field("getPdfUrlByKey", {
            type: "Any",
            args: {
                key: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
            },
            async resolve(_root, args, ctx) {
                const document = await ctx.db.document.findUnique({
                    where: {
                        key: args.key,
                    },
                });
                if (!document) {
                    throw new Error("Document not found");
                }
                const getObjectParams = {
                    Bucket: bucketName,
                    Key: document.key,
                };
                const command = new client_s3_2.GetObjectCommand(getObjectParams);
                const response = await S3Bucket_1.s3.send(command);
                if (!response.Body) {
                    throw new Error("Unable to retrieve s3 object");
                }
                const arrayBuffer = await response.Body.transformToByteArray();
                const buffer = Buffer.from(arrayBuffer);
                return {
                    file: buffer.toString("base64"),
                    name: document.name,
                    size: document.size,
                    contentType: response.ContentType,
                    lastModified: response.LastModified,
                };
            },
        });
        t.field("getALLPDFURLBelongingToUserByUid", {
            type: (0, nexus_1.nonNull)((0, nexus_1.list)((0, nexus_1.nonNull)("String"))),
            args: {
                uid: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
            },
            async resolve(_root, args, ctx) {
                const keysArr = await ctx.db.document.findMany({
                    where: {
                        uid: args.uid,
                    },
                });
                const commandArray = await Promise.all(keysArr.map((key) => {
                    const command = new client_s3_2.GetObjectCommand({
                        Bucket: bucketName,
                        Key: key.key,
                        ResponseContentDisposition: "inline",
                        ResponseContentType: "application/pdf",
                    });
                    return command;
                }));
                const urlArray = Promise.all(commandArray.map(async (command) => {
                    const url = await (0, s3_request_presigner_1.getSignedUrl)(S3Bucket_1.s3, command, { expiresIn: 3000 });
                    return url;
                }));
                return urlArray;
            },
        });
        t.field("getAllPdfBelongingToUserByUid", {
            type: (0, nexus_1.nonNull)((0, nexus_1.list)((0, nexus_1.nonNull)("Document"))),
            args: {
                uid: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
            },
            async resolve(_root, args, ctx) {
                const pdf = await ctx.db.document.findMany({
                    where: {
                        uid: args.uid,
                    },
                });
                return pdf;
            },
        });
        t.field("getAllPdfBuffersByUid", {
            type: (0, nexus_1.list)((0, nexus_1.nonNull)("Any")),
            args: {
                uid: (0, nexus_1.nonNull)((0, nexus_1.stringArg)()),
            },
            async resolve(_root, args, ctx) {
                const pdfBufferArray = await ctx.db.document.findMany({
                    where: {
                        uid: args.uid,
                    },
                });
                const returnBufferArray = await Promise.all(pdfBufferArray.map(async (document) => {
                    const getObjectParams = {
                        Bucket: bucketName,
                        Key: document.key,
                    };
                    const command = new client_s3_2.GetObjectCommand(getObjectParams);
                    const response = await S3Bucket_1.s3.send(command);
                    if (!response.Body) {
                        throw new Error("Unable to retrieve s3 object");
                    }
                    const arrayBuffer = await response.Body.transformToByteArray();
                    const buffer = Buffer.from(arrayBuffer);
                    return {
                        file: buffer.toString("base64"),
                        name: document.name,
                        size: document.size,
                        contentType: response.ContentType,
                        lastModified: response.LastModified,
                    };
                }));
                return returnBufferArray;
            },
        });
    },
});
// TODO:
// 1. create a pipeline to turn pdf into markdown file
// 2. given the key of a pdf document get its buffer then convert it to
// 2. extract text from markdown files then
// 3. chunk and rag the documents into vector db for RAG applications
//# sourceMappingURL=Document.js.map