import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import { SolcConfig } from "@nomiclabs/buidler/types";

import { EtherscanConfig } from "../types";

export default class EtherscanVerifyContractRequest {
  // for that weird etherscan library props
  [key: string]: any;
  public readonly apikey: string;
  public readonly module: string = "contract";
  public readonly action: string = "verifysourcecode";
  public readonly contractaddress: string;
  public readonly sourceCode: string;
  public readonly contractname: string;
  public readonly compilerversion: string;
  public readonly optimizationUsed: number;
  public readonly runs: number;
  public readonly constructorArguements: string;

  constructor(
    etherscanConfig: EtherscanConfig,
    solcConfig: SolcConfig,
    contractName: string,
    address: string,
    libraries: string,
    source: string,
    constructorArguments: string
  ) {
    this.apikey = etherscanConfig.apiKey;
    this.contractaddress = address;
    this.sourceCode = source;
    this.contractname = contractName;
    this.compilerversion = solcConfig.fullVersion;
    this.optimizationUsed = solcConfig.optimizer.enabled ? 1 : 0;
    this.runs = solcConfig.optimizer.runs;
    this.constructorArguements = constructorArguments;
    this.setLibraries(libraries);
  }

  public serialize(): string {
    return JSON.stringify(this);
  }

  private setLibraries(libraries: string) {
    let i: number = 1;
    let parsedLibraries: { [key: string]: string } = {};
    try {
      if (libraries) {
        parsedLibraries = JSON.parse(libraries);
      }
    } catch (e) {
      throw new BuidlerPluginError(
        "Failed to parse libraries. Reason: " + e.message
      );
    }
    for (const libraryName in parsedLibraries) {
      if (parsedLibraries.hasOwnProperty(libraryName)) {
        this["libraryname" + i] = libraryName;
        this["libraryaddress" + i] = parsedLibraries[libraryName];
        i++;
        if (i >= 10) {
          break;
        }
      }
    }
  }
}
