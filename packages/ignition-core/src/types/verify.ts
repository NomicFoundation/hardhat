import type { SolidityParameterType } from "./module.js";

/**
 * The configuration info needed to verify a contract on Etherscan on a given chain.
 *
 * @public
 */
export interface ChainConfig {
  network: string;
  chainId: number;
  urls: {
    apiURL: string;
    browserURL: string;
  };
}

/**
 * A map of source names to library names to their addresses.
 * Used to verify contracts with libraries that cannot be derived from the bytecode.
 * i.e. contracts that use libraries in their constructor
 *
 * @public
 */
export interface SourceToLibraryToAddress {
  [sourceName: string]: {
    [libraryName: string]: string;
  };
}

/**
 * The information required to verify a contract.
 *
 * @public
 */
export interface VerifyInfo {
  address: string;
  constructorArgs: SolidityParameterType[];
  libraries: Record<string, string>;
  contract: string;
  creationTxHash?: string;
}

/**
 * The result of requesting the verification info for a deployment.
 * It returns a VerifyInfo object for each contract to be verified.
 * Alternatively, it returns the contract name if the contract used
 * external artifacts that could not be resolved for verification.
 *
 * @public
 */
export type VerifyResult = VerifyInfo | string;
