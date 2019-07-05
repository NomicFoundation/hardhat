import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";

export interface EtherscanRequestParameters {
  apikey: string;
  module: "contract";
  action: "verifysourcecode";
  contractaddress: string;
  sourceCode: string;
  contractname: string;
  compilerversion: string;
  // The documentation is contradictory, but below is correct at this point in time (checked by experimentation).
  // 1 = Optimizations used
  // 0 = No optimizations used
  optimizationUsed: number;
  runs: number;
  // This is misspelt in Etherscan's actual API parameters.
  // See: https://etherscan.io/apis#contracts
  constructorArguements: string;
  // For libraries, these should be pairs of the form
  // libraryname1, libraryaddress1, ..., libraryname10, libraryaddress10
  // Yes, up to 10 only.
}

export function toRequest(params: {
  apiKey: string;
  contractAddress: string;
  sourceCode: string;
  contractName: string;
  compilerVersion: string;
  optimizationsUsed: boolean;
  runs: number;
  constructorArguments: string;
  libraries: string;
}): EtherscanRequestParameters {
  return {
    apikey: params.apiKey,
    module: "contract",
    action: "verifysourcecode",
    contractaddress: params.contractAddress,
    sourceCode: params.sourceCode,
    contractname: params.contractName,
    compilerversion: params.compilerVersion,
    optimizationUsed: params.optimizationsUsed ? 1 : 0,
    runs: params.runs,
    constructorArguements: params.constructorArguments,
    ...parseLibraries(params.libraries)
  };
}

function parseLibraries(libraries?: string): { [key: string]: string } {
  let parsedLibraries: { [key: string]: string } = {};
  try {
    if (libraries !== undefined && libraries !== "") {
      parsedLibraries = JSON.parse(libraries);
    }
  } catch (e) {
    throw new BuidlerPluginError(
      `Failed to parse libraries. Reason: ${e.message}`
    );
  }

  return Object.entries(parsedLibraries).reduce<{ [key: string]: string }>(
    (acc, [libraryName, libraryAddress], index) => {
      acc[`libraryname${index + 1}`] = libraryName;
      acc[`libraryaddress${index + 1}`] = libraryAddress;

      return acc;
    },
    {}
  );
}
