/**
 * The type of the contract artifact's ABI.
 *
 * @public
 */
export type Abi = readonly any[] | any[];

/**
 * The links between libraries and their references in the bytecode.
 *
 * @public
 */
export type LinkReferences = Record<
  string,
  Record<string, Array<{ length: number; start: number }>>
>;

/**
 * The references to the immutable variables that get embedded in the deployed
 * bytecode.
 *
 * Each immutable variable is represented by an id, which in the case of solc
 * is the id of the AST node that represents the variable.
 *
 * @public
 */
export interface ImmutableReferences {
  [immutableId: string]: Array<{ start: number; length: number }>;
}

/**
 * An compilation artifact representing a smart contract.
 *
 * @public
 */
export interface Artifact<AbiT extends Abi = Abi> {
  _format: string;
  contractName: string;
  sourceName: string;
  abi: AbiT;
  bytecode: string;
  deployedBytecode: string;
  linkReferences: LinkReferences;
  deployedLinkReferences: LinkReferences;
  immutableReferences?: ImmutableReferences;
  buildInfoId?: string;
  inputSourceName?: string;
}

/**
 * Retrieve artifacts based on contract name.
 *
 * @public
 */
export interface ArtifactResolver {
  loadArtifact(contractName: string): Promise<Artifact>;
  getBuildInfo(contractName: string): Promise<BuildInfo | undefined>;
}

/**
 * A BuildInfo is a file that contains all the information of a solc run. It
 * includes all the necessary information to recreate that exact same run, and
 * all of its output.
 *
 * @public
 */
export interface BuildInfo {
  _format: string;
  id: string;
  solcVersion: string;
  solcLongVersion: string;
  input: CompilerInput;
  userSourceNameMap: Record<string, string>;
}

/**
 * The solc input for running the compilation.
 *
 * @public
 */
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

/**
 * The output of a compiled contract from solc.
 *
 * @public
 */
export interface CompilerOutputContract {
  abi: any;
  evm: {
    bytecode: CompilerOutputBytecode;
    deployedBytecode: CompilerOutputBytecode;
    methodIdentifiers: {
      [methodSignature: string]: string;
    };
  };
}

/**
 * The compilation output from solc.
 *
 * @public
 */
export interface CompilerOutput {
  sources: CompilerOutputSources;
  contracts: {
    [sourceName: string]: {
      [contractName: string]: CompilerOutputContract;
    };
  };
}

/**
 * The ast for a compiled contract.
 *
 * @public
 */
export interface CompilerOutputSource {
  id: number;
  ast: any;
}

/**
 * The asts for the compiled contracts.
 *
 * @public
 */
export interface CompilerOutputSources {
  [sourceName: string]: CompilerOutputSource;
}

/**
 * The solc bytecode output.
 *
 * @public
 */
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
