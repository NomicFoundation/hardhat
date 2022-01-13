"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeHardhatNetworkAccountsConfig = exports.derivePrivateKeys = void 0;
const keys_derivation_1 = require("../../util/keys-derivation");
const default_config_1 = require("../config/default-config");
const errors_1 = require("../errors");
const errors_list_1 = require("../errors-list");
const HD_PATH_REGEX = /^m(:?\/\d+'?)+\/?$/;
function derivePrivateKeys(mnemonic, hdpath, initialIndex, count) {
    if (hdpath.match(HD_PATH_REGEX) === null) {
        throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.INVALID_HD_PATH, { path: hdpath });
    }
    if (!hdpath.endsWith("/")) {
        hdpath += "/";
    }
    const privateKeys = [];
    for (let i = initialIndex; i < initialIndex + count; i++) {
        const privateKey = (0, keys_derivation_1.deriveKeyFromMnemonicAndPath)(mnemonic, hdpath + i.toString());
        if (privateKey === undefined) {
            throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.CANT_DERIVE_KEY, {
                mnemonic,
                path: hdpath,
            });
        }
        privateKeys.push(privateKey);
    }
    return privateKeys;
}
exports.derivePrivateKeys = derivePrivateKeys;
function normalizeHardhatNetworkAccountsConfig(accountsConfig) {
    if (Array.isArray(accountsConfig)) {
        return accountsConfig;
    }
    const { bufferToHex } = require("ethereumjs-util");
    return derivePrivateKeys(accountsConfig.mnemonic, accountsConfig.path, accountsConfig.initialIndex, accountsConfig.count).map((pk) => {
        var _a;
        return ({
            privateKey: bufferToHex(pk),
            balance: (_a = accountsConfig.accountsBalance) !== null && _a !== void 0 ? _a : default_config_1.DEFAULT_HARDHAT_NETWORK_BALANCE,
        });
    });
}
exports.normalizeHardhatNetworkAccountsConfig = normalizeHardhatNetworkAccountsConfig;
//# sourceMappingURL=util.js.map