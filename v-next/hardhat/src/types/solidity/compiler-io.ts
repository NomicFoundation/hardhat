export interface CompilerInput {
  language: string;
  sources: { [sourceName: string]: { content: string } };
  settings: {
    viaIR?: boolean;
    optimizer: {
      runs?: number;
      enabled?: boolean;
      details?: {
        yulDetails: {
          optimizerSteps: string;
        };
      };
    };
    metadata?: { useLiteralContent: boolean };
    outputSelection: {
      [sourceName: string]: {
        [contractName: string]: string[];
      };
    };
    evmVersion?: string;
    libraries?: {
      [libraryFileName: string]: {
        [libraryName: string]: string;
      };
    };
    remappings?: string[];
  };
}

export interface CompilerOutputSource {
  id: number;
  ast: any;
}

export interface CompilerOutputSources {
  [sourceName: string]: CompilerOutputSource;
}

export interface CompilerOutputBytecode {
  object: string;
  opcodes: string;
  sourceMap: string;
  linkReferences: {
    [sourceName: string]: {
      [libraryName: string]: Array<{ start: number; length: 20 }>;
    };
  };
  immutableReferences?: {
    [key: string]: Array<{ start: number; length: number }>;
  };
}

export interface CompilerOutputContract {
  abi: any;
  evm?: {
    bytecode?: CompilerOutputBytecode;
    deployedBytecode?: CompilerOutputBytecode;
    methodIdentifiers: {
      [methodSignature: string]: string;
    };
  };
}

export interface CompilerOutput {
  errors?: CompilerOutputError[];
  sources: CompilerOutputSources;
  contracts?: {
    [sourceName: string]: {
      [contractName: string]: CompilerOutputContract;
    };
  };
}

export interface CompilerOutputError {
  type: string;
  component: string;
  message: string;
  severity: "error" | "warning" | "info";
  errorCode?: string;
  formattedMessage?: string;
}
