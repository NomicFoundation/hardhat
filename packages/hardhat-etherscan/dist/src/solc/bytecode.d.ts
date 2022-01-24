import { Artifacts, BuildInfo, CompilerInput, CompilerOutput, CompilerOutputBytecode } from "hardhat/types";
interface BytecodeExtractedData {
    immutableValues: ImmutableValues;
    libraryLinks: ResolvedLinks;
    normalizedBytecode: string;
}
export interface ResolvedLinks {
    [sourceName: string]: {
        [libraryName: string]: string;
    };
}
interface ImmutableValues {
    [key: string]: string;
}
declare type SourceName = string;
declare type ContractName = string;
export interface ContractInformation extends BytecodeExtractedData {
    compilerInput: CompilerInput;
    compilerOutput: CompilerOutput;
    solcVersion: string;
    sourceName: SourceName;
    contractName: ContractName;
    contract: CompilerOutput["contracts"][SourceName][ContractName];
}
export declare class Bytecode {
    private _bytecode;
    private _version;
    private _isOvm;
    private _executableSection;
    private _metadataSection;
    constructor(bytecode: string);
    getInferredSolcVersion(): string;
    isOvmInferred(): boolean;
    getExecutableSection(): string;
    hasMetadata(): boolean;
}
export declare function lookupMatchingBytecode(artifacts: Artifacts, matchingCompilerVersions: string[], deployedBytecode: Bytecode): Promise<ContractInformation[]>;
export declare function extractMatchingContractInformation(sourceName: SourceName, contractName: ContractName, buildInfo: BuildInfo, deployedBytecode: Bytecode): Promise<ContractInformation | null>;
export declare function compareBytecode(deployedBytecode: Bytecode, runtimeBytecodeSymbols: CompilerOutputBytecode): Promise<BytecodeExtractedData | null>;
export declare function normalizeBytecode(bytecode: string, symbols: CompilerOutputBytecode): Promise<BytecodeExtractedData>;
export {};
//# sourceMappingURL=bytecode.d.ts.map