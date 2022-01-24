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
exports.encodeArguments = void 0;
const plugins_1 = require("hardhat/plugins");
const ABITypes_1 = require("./ABITypes");
const constants_1 = require("./constants");
async function encodeArguments(abi, sourceName, contractName, constructorArguments) {
    const { Interface } = await Promise.resolve().then(() => __importStar(require("@ethersproject/abi")));
    const contractInterface = new Interface(abi);
    let deployArgumentsEncoded;
    try {
        deployArgumentsEncoded = contractInterface
            .encodeDeploy(constructorArguments)
            .replace("0x", "");
    }
    catch (error) {
        if ((0, ABITypes_1.isABIArgumentLengthError)(error)) {
            // TODO: add a list of types and constructor arguments to the error message?
            const message = `The constructor for ${sourceName}:${contractName} has ${error.count.types} parameters
but ${error.count.values} arguments were provided instead.`;
            throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, message, error);
        }
        if ((0, ABITypes_1.isABIArgumentTypeError)(error)) {
            const message = `Value ${error.value} cannot be encoded for the parameter ${error.argument}.
Encoder error reason: ${error.reason}`;
            throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, message, error);
        }
        if ((0, ABITypes_1.isABIArgumentOverflowError)(error)) {
            const message = `Value ${error.value} is not a safe integer and cannot be encoded.
Use a string instead of a plain number.
Encoder error reason: ${error.fault} fault in ${error.operation}`;
            throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, message, error);
        }
        // Should be unreachable.
        throw error;
    }
    return deployArgumentsEncoded;
}
exports.encodeArguments = encodeArguments;
//# sourceMappingURL=ABIEncoder.js.map