"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCheckStatusRequest = exports.toVerifyRequest = void 0;
function toVerifyRequest(params) {
    return {
        apikey: params.apiKey,
        module: "contract",
        action: "verifysourcecode",
        contractaddress: params.contractAddress,
        sourceCode: params.sourceCode,
        codeformat: "solidity-standard-json-input",
        contractname: `${params.sourceName}:${params.contractName}`,
        compilerversion: params.compilerVersion,
        constructorArguements: params.constructorArguments,
    };
}
exports.toVerifyRequest = toVerifyRequest;
function toCheckStatusRequest(params) {
    return {
        apikey: params.apiKey,
        module: "contract",
        action: "checkverifystatus",
        guid: params.guid,
    };
}
exports.toCheckStatusRequest = toCheckStatusRequest;
//# sourceMappingURL=EtherscanVerifyContractRequest.js.map