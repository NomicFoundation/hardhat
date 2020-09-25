import { NomicLabsHardhatPluginError } from "hardhat/internal/core/errors";
import { NetworkConfig } from "hardhat/types";

import { DEFAULT_GAS_MULTIPLIER } from "./constants";
import { Linker, TruffleContract } from "./types";

export class LazyTruffleContractProvisioner {
  private readonly _web3: any;
  private readonly _deploymentAddresses: {
    [contractName: string]: string;
  } = {};

  constructor(web3: any, private readonly _networkConfig: NetworkConfig) {
    this._web3 = web3;
  }

  public provision(Contract: TruffleContract, linker: Linker) {
    Contract.setProvider(this._web3.currentProvider);

    this._setDefaultValues(Contract);

    const originalLink = Contract.link;

    const alreadyLinkedLibs: { [libName: string]: boolean } = {};
    let linkingByInstance = false;

    Contract.link = (...args: any[]) => {
      // This is a simple way to detect if it is being called with a contract as first argument.
      if (args[0].constructor.name === "TruffleContract") {
        const libName = args[0].constructor.contractName;

        if (alreadyLinkedLibs[libName]) {
          throw new NomicLabsHardhatPluginError(
            "@nomiclabs/hardhat-truffle5",
            `Contract ${Contract.contractName} has already been linked to ${libName}.`
          );
        }

        linkingByInstance = true;
        const ret = linker.link(Contract, args[0]);
        alreadyLinkedLibs[libName] = true;
        linkingByInstance = false;

        return ret;
      }

      if (!linkingByInstance) {
        if (typeof args[0] === "string") {
          throw new NomicLabsHardhatPluginError(
            "@nomiclabs/hardhat-truffle5",
            `Linking contracts by name is not supported by Hardhat. Please use ${Contract.contractName}.link(libraryInstance) instead.`
          );
        }

        throw new NomicLabsHardhatPluginError(
          "@nomiclabs/hardhat-truffle5",
          `Linking contracts with a map of addresses is not supported by Hardhat. Please use ${Contract.contractName}.link(libraryInstance) instead.`
        );
      }

      originalLink.apply(Contract, args);
    };

    Contract.deployed = async () => {
      const address = this._deploymentAddresses[Contract.contractName];

      if (address === undefined) {
        throw new NomicLabsHardhatPluginError(
          "@nomiclabs/hardhat-truffle5",
          `Trying to get deployed instance of ${Contract.contractName}, but none was set.`
        );
      }

      return Contract.at(address);
    };

    Contract.setAsDeployed = (instance?: any) => {
      if (instance === undefined) {
        delete this._deploymentAddresses[Contract.contractName];
      } else {
        this._deploymentAddresses[Contract.contractName] = instance.address;
      }
    };

    this._hookCloneCalls(Contract, linker);

    return Contract;
  }

  private _setDefaultValues(Contract: TruffleContract) {
    const defaults: any = {};
    let hasDefaults = false;
    if (typeof this._networkConfig.gas === "number") {
      defaults.gas = this._networkConfig.gas;
      hasDefaults = true;
    }

    if (typeof this._networkConfig.gasPrice === "number") {
      defaults.gasPrice = this._networkConfig.gasPrice;
      hasDefaults = true;
    }

    if (hasDefaults) {
      Contract.defaults(defaults);
    }

    Contract.gasMultiplier =
      this._networkConfig.gasMultiplier !== undefined
        ? this._networkConfig.gasMultiplier
        : DEFAULT_GAS_MULTIPLIER;
  }

  private _hookCloneCalls(Contract: TruffleContract, linker: Linker) {
    const originalClone = Contract.clone;

    Contract.clone = (...args: any[]) => {
      const cloned = originalClone.apply(Contract, args);

      return this.provision(cloned, linker);
    };
  }
}
