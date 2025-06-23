"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriseTransactions = void 0;
const genai_1 = require("@google/genai");
const gemini_1 = require("./gemini");
const categoriseTransactions = async (transactions, batchSize, categories) => {
    console.log({ transactions });
    const prompt = `
    Please assign each of the transactions provided one of the following categories. 
    Make the best possible guess based on the information provided. 
    If there's no clue whatsoever, assign a null category. But try to avoid null categories if possible.

    RETURN ONLY THE JSON, NO OTHER CHARACTERS.
    
    Give your response as a JSON in the following format:
    {
      transactionId: number;
      categoryId: number | null; 
    }[]

    ## Example:

    #### Input:
    
    Categories: [
      {
        id: 1,
        name: "Leisure",
        description: "Anything I did for fun, not including food. e.g. cinema, theme park, bowling etc",
      },
      {
        id: 2,
        name: "Travel",
        description: "Anything I spent on getting to places. e.g. buses, trains and flights",
      }
    ]

    Transaction: [
      {
        id: 12,
        merchantName: "Blue Planet Aquarium",
        amount: 42,
      },
      {
        id: 27,
        merchantName: "Trainline",
        amount: 55,
      }
    ]
    
    #### Correct Output:
    [
      {
        transactionId: 12,
        categoryId: 1,
      },
      {
        transactionId: 27,
        categoryId: 2,
      },
    ]
    
    #### Explanation: 
    Transaction with id 12 is for an aquarium, which counts as a leisure activity. (category id 1)
    Transaction with id 27 is spent on Trainline, an app used to purchase train tickets, hence is travel. (category id 2)

    ## Actual Inputs:

    #### Categories: 
    ${JSON.stringify(categories)}

    ## Transactions:
  `;
    const batchedTransactions = [];
    const batch = [];
    for (let i = 0; i < transactions.length; i++) {
        batch.push(transactions[i]);
        if ((i + 1) % batchSize === 0) {
            batchedTransactions.push([...batch]);
            batch.length = 0;
        }
    }
    batchedTransactions.push([...batch]);
    console.log({ batchedTransactions });
    console.log(batchedTransactions.length);
    batch.length = 0;
    const result = await Promise.all(batchedTransactions.flatMap((batch) => {
        const response = gemini_1.ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt + JSON.stringify(batch),
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: genai_1.Type.ARRAY,
                    items: {
                        type: genai_1.Type.OBJECT,
                        properties: {
                            transactionId: {
                                type: genai_1.Type.INTEGER,
                                nullable: false,
                            },
                            categoryId: {
                                type: genai_1.Type.INTEGER,
                                nullable: false,
                            },
                        },
                        required: ["transactionId", "categoryId"],
                    },
                },
            },
        });
        return response;
    }));
    const parsedResult = result
        .flatMap((object) => (object.text ? JSON.parse(object.text) : undefined))
        .filter((output) => output);
    return parsedResult;
};
exports.categoriseTransactions = categoriseTransactions;
//# sourceMappingURL=autoCategorisation.js.map