"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeStateTrie = void 0;
const ethereumjs_util_1 = require("ethereumjs-util");
const merkle_patricia_tree_1 = require("merkle-patricia-tree");
const makeAccount_1 = require("./makeAccount");
async function makeStateTrie(genesisAccounts) {
    const stateTrie = new merkle_patricia_tree_1.SecureTrie();
    for (const acc of genesisAccounts) {
        const { address, account } = (0, makeAccount_1.makeAccount)(acc);
        await stateTrie.put(address.toBuffer(), account.serialize());
    }
    // Mimic precompiles activation
    for (let i = 1; i <= 8; i++) {
        await stateTrie.put(new ethereumjs_util_1.BN(i).toArrayLike(Buffer, "be", 20), new ethereumjs_util_1.Account().serialize());
    }
    return stateTrie;
}
exports.makeStateTrie = makeStateTrie;
//# sourceMappingURL=makeStateTrie.js.map