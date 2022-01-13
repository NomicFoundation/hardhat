"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixedSenderProvider = exports.AutomaticSenderProvider = exports.HDWalletProvider = exports.LocalAccountsProvider = void 0;
const t = __importStar(require("io-ts"));
const tx_1 = require("@ethereumjs/tx");
const errors_1 = require("../errors");
const errors_list_1 = require("../errors-list");
const base_types_1 = require("../jsonrpc/types/base-types");
const transactionRequest_1 = require("../jsonrpc/types/input/transactionRequest");
const validation_1 = require("../jsonrpc/types/input/validation");
const chainId_1 = require("./chainId");
const util_1 = require("./util");
const wrapper_1 = require("./wrapper");
const ethSigUtil = require("eth-sig-util");
class LocalAccountsProvider extends chainId_1.ProviderWrapperWithChainId {
    constructor(provider, localAccountsHexPrivateKeys) {
        super(provider);
        this._addressToPrivateKey = new Map();
        this._initializePrivateKeys(localAccountsHexPrivateKeys);
    }
    async request(args) {
        const { ecsign, hashPersonalMessage, toRpcSig, toBuffer, bufferToHex } = await Promise.resolve().then(() => __importStar(require("ethereumjs-util")));
        if (args.method === "eth_accounts" ||
            args.method === "eth_requestAccounts") {
            return [...this._addressToPrivateKey.keys()];
        }
        const params = this._getParams(args);
        if (args.method === "eth_sign") {
            if (params.length > 0) {
                const [address, data] = (0, validation_1.validateParams)(params, base_types_1.rpcAddress, base_types_1.rpcData);
                if (address !== undefined) {
                    if (data === undefined) {
                        throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.ETHSIGN_MISSING_DATA_PARAM);
                    }
                    const privateKey = this._getPrivateKeyForAddress(address);
                    const messageHash = hashPersonalMessage(toBuffer(data));
                    const signature = ecsign(messageHash, privateKey);
                    return toRpcSig(signature.v, signature.r, signature.s);
                }
            }
        }
        if (args.method === "personal_sign") {
            if (params.length > 0) {
                const [data, address] = (0, validation_1.validateParams)(params, base_types_1.rpcData, base_types_1.rpcAddress);
                if (data !== undefined) {
                    if (address === undefined) {
                        throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.PERSONALSIGN_MISSING_ADDRESS_PARAM);
                    }
                    const privateKey = this._getPrivateKeyForAddress(address);
                    const messageHash = hashPersonalMessage(toBuffer(data));
                    const signature = ecsign(messageHash, privateKey);
                    return toRpcSig(signature.v, signature.r, signature.s);
                }
            }
        }
        if (args.method === "eth_signTypedData_v4") {
            const [address, data] = (0, validation_1.validateParams)(params, base_types_1.rpcAddress, t.any);
            if (data === undefined) {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.ETHSIGN_MISSING_DATA_PARAM);
            }
            let typedMessage = data;
            if (typeof data === "string") {
                try {
                    typedMessage = JSON.parse(data);
                }
                catch (_a) {
                    throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.ETHSIGN_TYPED_DATA_V4_INVALID_DATA_PARAM);
                }
            }
            // if we don't manage the address, the method is forwarded
            const privateKey = this._getPrivateKeyForAddressOrNull(address);
            if (privateKey !== null) {
                return ethSigUtil.signTypedData_v4(privateKey, {
                    data: typedMessage,
                });
            }
        }
        if (args.method === "eth_sendTransaction" && params.length > 0) {
            const [txRequest] = (0, validation_1.validateParams)(params, transactionRequest_1.rpcTransactionRequest);
            if (txRequest.gas === undefined) {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY, { param: "gas" });
            }
            if (txRequest.from === undefined) {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY, { param: "from" });
            }
            const hasGasPrice = txRequest.gasPrice !== undefined;
            const hasEip1559Fields = txRequest.maxFeePerGas !== undefined ||
                txRequest.maxPriorityFeePerGas !== undefined;
            if (!hasGasPrice && !hasEip1559Fields) {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.MISSING_FEE_PRICE_FIELDS);
            }
            if (hasGasPrice && hasEip1559Fields) {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.INCOMPATIBLE_FEE_PRICE_FIELDS);
            }
            if (hasEip1559Fields && txRequest.maxFeePerGas === undefined) {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY, { param: "maxFeePerGas" });
            }
            if (hasEip1559Fields && txRequest.maxPriorityFeePerGas === undefined) {
                throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.MISSING_TX_PARAM_TO_SIGN_LOCALLY, { param: "maxPriorityFeePerGas" });
            }
            if (txRequest.nonce === undefined) {
                txRequest.nonce = await this._getNonce(txRequest.from);
            }
            const privateKey = this._getPrivateKeyForAddress(txRequest.from);
            const chainId = await this._getChainId();
            const rawTransaction = await this._getSignedTransaction(txRequest, chainId, privateKey);
            return this._wrappedProvider.request({
                method: "eth_sendRawTransaction",
                params: [bufferToHex(rawTransaction)],
            });
        }
        return this._wrappedProvider.request(args);
    }
    _initializePrivateKeys(localAccountsHexPrivateKeys) {
        const { bufferToHex, toBuffer, privateToAddress, } = require("ethereumjs-util");
        const privateKeys = localAccountsHexPrivateKeys.map((h) => toBuffer(h));
        for (const pk of privateKeys) {
            const address = bufferToHex(privateToAddress(pk)).toLowerCase();
            this._addressToPrivateKey.set(address, pk);
        }
    }
    _getPrivateKeyForAddress(address) {
        const { bufferToHex } = require("ethereumjs-util");
        const pk = this._addressToPrivateKey.get(bufferToHex(address));
        if (pk === undefined) {
            throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.NOT_LOCAL_ACCOUNT, {
                account: bufferToHex(address),
            });
        }
        return pk;
    }
    _getPrivateKeyForAddressOrNull(address) {
        try {
            return this._getPrivateKeyForAddress(address);
        }
        catch (_a) {
            return null;
        }
    }
    async _getNonce(address) {
        const { bufferToHex } = await Promise.resolve().then(() => __importStar(require("ethereumjs-util")));
        const response = (await this._wrappedProvider.request({
            method: "eth_getTransactionCount",
            params: [bufferToHex(address), "pending"],
        }));
        return (0, base_types_1.rpcQuantityToBN)(response);
    }
    async _getSignedTransaction(transactionRequest, chainId, privateKey) {
        var _a;
        const { chains } = await Promise.resolve().then(() => __importStar(require("@ethereumjs/common/dist/chains")));
        const { AccessListEIP2930Transaction, Transaction } = await Promise.resolve().then(() => __importStar(require("@ethereumjs/tx")));
        const { default: Common } = await Promise.resolve().then(() => __importStar(require("@ethereumjs/common")));
        const txData = Object.assign(Object.assign({}, transactionRequest), { gasLimit: transactionRequest.gas });
        // TODO: consider changing instances of "london" below to ["latest hardfork"]
        const common = chains.names[chainId] !== undefined
            ? new Common({ chain: chainId, hardfork: "london" })
            : Common.forCustomChain("mainnet", {
                chainId,
                networkId: chainId,
            }, "london");
        // we convert the access list to the type
        // that AccessListEIP2930Transaction expects
        const accessList = (_a = txData.accessList) === null || _a === void 0 ? void 0 : _a.map(({ address, storageKeys }) => [address, storageKeys]);
        let transaction;
        if (txData.maxFeePerGas !== undefined) {
            transaction = tx_1.FeeMarketEIP1559Transaction.fromTxData(Object.assign(Object.assign({}, txData), { accessList, gasPrice: undefined }), { common });
        }
        else if (accessList !== undefined) {
            transaction = AccessListEIP2930Transaction.fromTxData(Object.assign(Object.assign({}, txData), { accessList }), { common });
        }
        else {
            transaction = Transaction.fromTxData(txData, { common });
        }
        const signedTransaction = transaction.sign(privateKey);
        return signedTransaction.serialize();
    }
}
exports.LocalAccountsProvider = LocalAccountsProvider;
class HDWalletProvider extends LocalAccountsProvider {
    constructor(provider, mnemonic, hdpath = "m/44'/60'/0'/0/", initialIndex = 0, count = 10) {
        const privateKeys = (0, util_1.derivePrivateKeys)(mnemonic, hdpath, initialIndex, count);
        const { bufferToHex } = require("ethereumjs-util");
        const privateKeysAsHex = privateKeys.map((pk) => bufferToHex(pk));
        super(provider, privateKeysAsHex);
    }
}
exports.HDWalletProvider = HDWalletProvider;
class SenderProvider extends wrapper_1.ProviderWrapper {
    async request(args) {
        const method = args.method;
        const params = this._getParams(args);
        if (method === "eth_sendTransaction" ||
            method === "eth_call" ||
            method === "eth_estimateGas") {
            // TODO: Should we validate this type?
            const tx = params[0];
            if (tx !== undefined && tx.from === undefined) {
                const senderAccount = await this._getSender();
                if (senderAccount !== undefined) {
                    tx.from = senderAccount;
                }
                else if (method === "eth_sendTransaction") {
                    throw new errors_1.HardhatError(errors_list_1.ERRORS.NETWORK.NO_REMOTE_ACCOUNT_AVAILABLE);
                }
            }
        }
        return this._wrappedProvider.request(args);
    }
}
class AutomaticSenderProvider extends SenderProvider {
    async _getSender() {
        if (this._firstAccount === undefined) {
            const accounts = (await this._wrappedProvider.request({
                method: "eth_accounts",
            }));
            this._firstAccount = accounts[0];
        }
        return this._firstAccount;
    }
}
exports.AutomaticSenderProvider = AutomaticSenderProvider;
class FixedSenderProvider extends SenderProvider {
    constructor(provider, _sender) {
        super(provider);
        this._sender = _sender;
    }
    async _getSender() {
        return this._sender;
    }
}
exports.FixedSenderProvider = FixedSenderProvider;
//# sourceMappingURL=accounts.js.map