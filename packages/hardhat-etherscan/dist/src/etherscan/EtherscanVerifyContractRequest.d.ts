export interface EtherscanRequest {
    apikey: string;
    module: "contract";
    action: string;
}
export interface EtherscanVerifyRequest extends EtherscanRequest {
    action: "verifysourcecode";
    contractaddress: string;
    sourceCode: string;
    codeformat: "solidity-standard-json-input";
    contractname: string;
    compilerversion: string;
    constructorArguements: string;
}
export interface EtherscanCheckStatusRequest extends EtherscanRequest {
    action: "checkverifystatus";
    guid: string;
}
export declare function toVerifyRequest(params: {
    apiKey: string;
    contractAddress: string;
    sourceCode: string;
    sourceName: string;
    contractName: string;
    compilerVersion: string;
    constructorArguments: string;
}): EtherscanVerifyRequest;
export declare function toCheckStatusRequest(params: {
    apiKey: string;
    guid: string;
}): EtherscanCheckStatusRequest;
//# sourceMappingURL=EtherscanVerifyContractRequest.d.ts.map