export interface CompilerInput {
  language: "Solidity";
  sources: { [fileGlobalName: string]: { content: string } };
  settings: {
    optimizer: { runs: number; enabled: boolean };
    outputSelection: {
      "*": {
        "*": string[];
        "": ["id", "ast"];
      };
    };
    evmVersion?: string;
  };
}

export interface CompilerOutput {
  sources: CompilerOutputSources;
  contracts: {
    [globalName: string]: {
      [contractName: string]: {
        abi: any;
        evm: {
          bytecode: CompilerOutputBytecode;
          deployedBytecode: CompilerOutputBytecode;
          methodIdentifiers: {
            [methodSignature: string]: string;
          };
        };
      };
    };
  };
}

export interface CompilerOutputSource {
  id: number;
  ast: any;
}

export interface CompilerOutputSources {
  [globalName: string]: CompilerOutputSource;
}

export interface CompilerOutputBytecode {
  object: string;
  opcodes: string;
  sourceMap: string;
  linkReferences: {
    [libraryFileGlobalName: string]: {
      [libraryName: string]: Array<{ start: 0; length: 20 }>;
    };
  };
  immutableReferences?: {
    [key: string]: Array<{ start: number; length: number }>;
  };
}
