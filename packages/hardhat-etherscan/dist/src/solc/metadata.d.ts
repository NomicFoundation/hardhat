/// <reference types="node" />
interface MetadataDescription {
    solcVersion: string;
    metadataSectionSizeInBytes: number;
}
export declare const METADATA_LENGTH_SIZE = 2;
export declare const METADATA_PRESENT_SOLC_NOT_FOUND_VERSION_RANGE = "0.4.7 - 0.5.8";
export declare const METADATA_ABSENT_VERSION_RANGE = "<0.4.7";
export declare function inferSolcVersion(bytecode: Buffer): MetadataDescription;
export declare function decodeSolcMetadata(bytecode: Buffer): {
    decoded: any;
    metadataSectionSizeInBytes: number;
};
export declare function getSolcMetadataSectionLength(bytecode: Buffer): number;
/**
 * This function helps us measure the size of the executable section
 * without actually decoding the whole bytecode string.
 *
 * This is useful because the runtime object emitted by the compiler
 * may contain nonhexadecimal characters due to link placeholders.
 */
export declare function measureExecutableSectionLength(bytecode: string): number;
export {};
//# sourceMappingURL=metadata.d.ts.map