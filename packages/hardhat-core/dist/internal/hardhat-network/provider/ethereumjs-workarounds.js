"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tx_1 = require("@ethereumjs/tx");
const baseTransaction_1 = require("@ethereumjs/tx/dist/baseTransaction");
// This is a hack to prevent Block.fromBlockData from recreating our
// transactions and changing their types. Note fromBlockData is used
// by the BlockBuilder to update block it's building.
const previousFromTxData = tx_1.TransactionFactory.fromTxData;
tx_1.TransactionFactory.fromTxData = function (txData, txOptions) {
    if (txData instanceof baseTransaction_1.BaseTransaction) {
        return txData;
    }
    return previousFromTxData.call(this, txData, txOptions);
};
//# sourceMappingURL=ethereumjs-workarounds.js.map