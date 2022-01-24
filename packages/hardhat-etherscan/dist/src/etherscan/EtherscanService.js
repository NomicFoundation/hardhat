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
exports.EtherscanResponse = exports.getVerificationStatus = exports.verifyContract = exports.delay = void 0;
const plugins_1 = require("hardhat/plugins");
const constants_1 = require("../constants");
async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.delay = delay;
// Used for polling the result of the contract verification.
const verificationIntervalMs = 3000;
async function verifyContract(url, req) {
    const { default: fetch } = await Promise.resolve().then(() => __importStar(require("node-fetch")));
    const parameters = new URLSearchParams(Object.assign({}, req));
    const requestDetails = {
        method: "post",
        body: parameters,
    };
    let response;
    try {
        response = await fetch(url, requestDetails);
    }
    catch (error) {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `Failed to send contract verification request.
Endpoint URL: ${url}
Reason: ${error.message}`, error);
    }
    if (!response.ok) {
        // This could be always interpreted as JSON if there were any such guarantee in the Etherscan API.
        const responseText = await response.text();
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `Failed to send contract verification request.
Endpoint URL: ${url}
The HTTP server response is not ok. Status code: ${response.status} Response text: ${responseText}`);
    }
    const etherscanResponse = new EtherscanResponse(await response.json());
    if (etherscanResponse.isBytecodeMissingInNetworkError()) {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `Failed to send contract verification request.
Endpoint URL: ${url}
Reason: The Etherscan API responded that the address ${req.contractaddress} does not have bytecode.
This can happen if the contract was recently deployed and this fact hasn't propagated to the backend yet.
Try waiting for a minute before verifying your contract. If you are invoking this from a script,
try to wait for five confirmations of your contract deployment transaction before running the verification subtask.`);
    }
    if (!etherscanResponse.isOk()) {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, etherscanResponse.message);
    }
    return etherscanResponse;
}
exports.verifyContract = verifyContract;
async function getVerificationStatus(url, req) {
    const parameters = new URLSearchParams(Object.assign({}, req));
    const urlWithQuery = new URL(url);
    urlWithQuery.search = parameters.toString();
    const { default: fetch } = await Promise.resolve().then(() => __importStar(require("node-fetch")));
    let response;
    try {
        response = await fetch(urlWithQuery);
        if (!response.ok) {
            // This could be always interpreted as JSON if there were any such guarantee in the Etherscan API.
            const responseText = await response.text();
            const message = `The HTTP server response is not ok. Status code: ${response.status} Response text: ${responseText}`;
            throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, message);
        }
    }
    catch (error) {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `Failure during etherscan status polling. The verification may still succeed but
should be checked manually.
Endpoint URL: ${urlWithQuery}
Reason: ${error.message}`, error);
    }
    const etherscanResponse = new EtherscanResponse(await response.json());
    if (etherscanResponse.isPending()) {
        await delay(verificationIntervalMs);
        return getVerificationStatus(url, req);
    }
    if (etherscanResponse.isVerificationFailure()) {
        return etherscanResponse;
    }
    if (!etherscanResponse.isOk()) {
        throw new plugins_1.NomicLabsHardhatPluginError(constants_1.pluginName, `The Etherscan API responded with a failure status.
The verification may still succeed but should be checked manually.
Reason: ${etherscanResponse.message}`);
    }
    return etherscanResponse;
}
exports.getVerificationStatus = getVerificationStatus;
class EtherscanResponse {
    constructor(response) {
        this.status = parseInt(response.status, 10);
        this.message = response.result;
    }
    isPending() {
        return this.message === "Pending in queue";
    }
    isVerificationFailure() {
        return this.message === "Fail - Unable to verify";
    }
    isVerificationSuccess() {
        return this.message === "Pass - Verified";
    }
    isBytecodeMissingInNetworkError() {
        return this.message.startsWith("Unable to locate ContractCode at");
    }
    isOk() {
        return this.status === 1;
    }
}
exports.EtherscanResponse = EtherscanResponse;
//# sourceMappingURL=EtherscanService.js.map