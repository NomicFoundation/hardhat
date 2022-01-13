"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.putGenesisBlock = void 0;
const block_1 = require("@ethereumjs/block");
async function putGenesisBlock(blockchain, common, initialBaseFee) {
    const header = {};
    if (initialBaseFee !== undefined) {
        header.baseFeePerGas = initialBaseFee;
    }
    const genesisBlock = block_1.Block.genesis({
        header,
    }, { common });
    await blockchain.addBlock(genesisBlock);
}
exports.putGenesisBlock = putGenesisBlock;
//# sourceMappingURL=putGenesisBlock.js.map