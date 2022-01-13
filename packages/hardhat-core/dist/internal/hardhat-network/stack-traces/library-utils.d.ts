/// <reference types="node" />
import { CompilerOutputBytecode } from "../../../types";
export declare function getLibraryAddressPositions(bytecodeOutput: CompilerOutputBytecode): number[];
export declare function normalizeCompilerOutputBytecode(compilerOutputBytecodeObject: string, addressesPositions: number[]): Buffer;
export declare function linkHexStringBytecode(code: string, address: string, position: number): string;
export declare function zeroOutAddresses(code: Buffer, addressesPositions: number[]): Buffer;
export declare function zeroOutSlices(code: Buffer, slices: Array<{
    start: number;
    length: number;
}>): Buffer;
export declare function normalizeLibraryRuntimeBytecodeIfNecessary(code: Buffer): Buffer;
//# sourceMappingURL=library-utils.d.ts.map