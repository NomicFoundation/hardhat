"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveKeyFromMnemonicAndPath = void 0;
function deriveKeyFromMnemonicAndPath(mnemonic, hdPath) {
    const { mnemonicToSeedSync, } = require("ethereum-cryptography/bip39");
    const seed = mnemonicToSeedSync(mnemonic);
    const { HDKey, } = require("ethereum-cryptography/hdkey");
    const masterKey = HDKey.fromMasterSeed(seed);
    const derived = masterKey.derive(hdPath);
    return derived.privateKey === null ? undefined : derived.privateKey;
}
exports.deriveKeyFromMnemonicAndPath = deriveKeyFromMnemonicAndPath;
//# sourceMappingURL=keys-derivation.js.map