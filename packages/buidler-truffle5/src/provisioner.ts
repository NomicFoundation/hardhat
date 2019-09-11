import { NetworkConfig } from "@nomiclabs/buidler/types";

import { DEFAULT_GAS_MULTIPLIER } from "./constants";
import { Linker, TruffleContract } from "./types";

export class LazyTruffleContractProvisioner {
  private readonly _web3: any;

  constructor(web3: any, private readonly _networkConfig: NetworkConfig) {
    this._web3 = web3;
  }

  public provision(Contract: TruffleContract, linker: Linker) {
    Contract.setProvider(this._web3.currentProvider);

    this._setDefaultValues(Contract);

    const originalLink = Contract.link;
    Contract.link = (...args: any[]) => {
      // This is a simple way to detect if it is being called with a contract as first argument.
      if (Array.isArray(args[0].abi)) {
        return linker.link(Contract, args[0]);
      }

      // TODO: This may break if called manually with (name, address), as solc changed
      // the format of its symbols.

      originalLink.apply(Contract, args);
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
      defaults.gas = this._networkConfig.gasPrice;
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
