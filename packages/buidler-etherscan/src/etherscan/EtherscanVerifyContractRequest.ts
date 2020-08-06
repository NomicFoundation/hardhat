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
  // This is misspelt in Etherscan's actual API parameters.
  // See: https://etherscan.io/apis#contracts
  constructorArguements: string;

  // These fields are relevant for other codeformats, e.g. single file.
  // For libraries, these should be pairs of the form
  // libraryname1, libraryaddress1, ..., libraryname10, libraryaddress10
  // Yes, up to 10 only.
  // The documentation is contradictory, but below is correct at this point in time (checked by experimentation).
  // 1 = Optimizations used
  // 0 = No optimizations used
  // optimizationUsed: number;
  // runs: number;
}

export interface EtherscanCheckStatusRequest extends EtherscanRequest {
  action: "checkverifystatus";
  guid: string;
}

export function toVerifyRequest(params: {
  apiKey: string;
  contractAddress: string;
  sourceCode: string;
  contractFilename: string;
  contractName: string;
  compilerVersion: string;
  constructorArguments: string;
}): EtherscanVerifyRequest {
  return {
    apikey: params.apiKey,
    module: "contract",
    action: "verifysourcecode",
    contractaddress: params.contractAddress,
    sourceCode: params.sourceCode,
    codeformat: "solidity-standard-json-input",
    contractname: `${params.contractFilename}:${params.contractName}`,
    compilerversion: params.compilerVersion,
    constructorArguements: params.constructorArguments,
  };
}

export function toCheckStatusRequest(params: {
  apiKey: string;
  guid: string;
}): EtherscanCheckStatusRequest {
  return {
    apikey: params.apiKey,
    module: "contract",
    action: "checkverifystatus",
    guid: params.guid,
  };
}
