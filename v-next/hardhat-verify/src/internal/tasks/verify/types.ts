import type { LibraryAddresses } from "../../libraries.js";

export interface VerifyActionArgs {
  address: string;
  constructorArgs: string[];
  constructorArgsPath?: string;
  contract?: string;
  librariesPath?: string;
  force?: boolean;
  // TODO: M5
  // listNetworks?: boolean;
}

export interface VerifyActionResolvedArgs {
  address: string;
  constructorArgs: string[];
  contract?: string;
  libraries: LibraryAddresses;
  force: boolean;
}
