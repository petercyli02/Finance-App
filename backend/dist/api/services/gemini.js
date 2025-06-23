"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
const genai_1 = require("@google/genai");
exports.ai = new genai_1.GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY });
//# sourceMappingURL=gemini.js.map