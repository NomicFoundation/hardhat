import type { LibraryAddresses } from "../../libraries.js";

export interface BaseVerifyActionArgs {
  address: string;
  constructorArgs: string[];
  constructorArgsPath?: string;
  contract?: string;
  librariesPath?: string;
  force?: boolean;
  // TODO: M5
  // listNetworks?: boolean;
}

export interface VerifyActionArgs extends BaseVerifyActionArgs {
  creationTxHash?: string; // Sourcify specific
}

export interface VerifyActionResolvedArgs {
  address: string;
  constructorArgs: unknown[];
  contract?: string;
  libraries: LibraryAddresses;
  force: boolean;
}
