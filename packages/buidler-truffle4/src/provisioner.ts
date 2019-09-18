import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import { NetworkConfig } from "@nomiclabs/buidler/types";
import util from "util";

import { Linker, TruffleContract, TruffleContractInstance } from "./types";

export class LazyTruffleContractProvisioner {
  private readonly _web3: any;
  private _defaultAccount?: string;

  constructor(
    web3: any,
    private readonly _networkConfig: NetworkConfig,
    defaultAccount?: string
  ) {
    this._defaultAccount = defaultAccount;
    this._web3 = web3;
  }

  public provision(Contract: TruffleContract, linker: Linker) {
    Contract.setProvider(this._web3.currentProvider);
    this._setDefaultValues(Contract);
    this._addDefaultParamsHooks(Contract, linker);
    this._hookCloneCalls(Contract, linker);

    return new Proxy(Contract, {
      construct(target, argumentsList, newTarget) {
        if (argumentsList.length > 0 && typeof argumentsList[0] === "string") {
          return target.at(argumentsList[0]);
        }

        return Reflect.construct(target, argumentsList, newTarget);
      }
    });
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

    if (this._defaultAccount !== undefined) {
      defaults.from = this._defaultAccount;
      hasDefaults = true;
    }

    if (hasDefaults) {
      Contract.defaults(defaults);
    }
  }

  private _addDefaultParamsHooks(Contract: TruffleContract, linker: Linker) {
    const originalNew = Contract.new;
    const originalAt = Contract.at;
    const originalLink = Contract.link;

    Contract.new = async (...args: any[]) => {
      args = await this._ensureTxParamsWithDefaults(args);

      const contractInstance = await originalNew.apply(Contract, args);

      this._addDefaultParamsToAllInstanceMethods(Contract, contractInstance);

      return contractInstance;
    };

    Contract.at = (...args: any[]) => {
      const contractInstance = originalAt.apply(Contract, args);

      this._addDefaultParamsToAllInstanceMethods(Contract, contractInstance);

      return contractInstance;
    };

    Contract.link = (...args: any[]) => {
      // This is a simple way to detect if it is being called with a contract as first argument.
      if (Array.isArray(args[0].abi)) {
        return linker.link(Contract, args[0]);
      }

      // TODO: This may break if called manually with (name, address), as solc changed
      // the format of its symbols.

      originalLink.apply(Contract, args);
    };
  }

  private _addDefaultParamsToAllInstanceMethods(
    Contract: TruffleContract,
    contractInstance: TruffleContractInstance
  ) {
    this._getContractInstanceMethodsToOverride(Contract).forEach(name =>
      this._addDefaultParamsToInstanceMethod(contractInstance, name)
    );
  }

  private _getContractInstanceMethodsToOverride(Contract: TruffleContract) {
    const DEFAULT_INSTANCE_METHODS_TO_OVERRIDE = ["sendTransaction"];

    const abiFunctions = Contract.abi
      .filter((item: any) => item.type === "function")
      .map((item: any) => item.name);

    return [...DEFAULT_INSTANCE_METHODS_TO_OVERRIDE, ...abiFunctions];
  }

  private _addDefaultParamsToInstanceMethod(
    instance: TruffleContractInstance,
    methodName: string
  ) {
    const abi = instance.contract.abi.filter(
      (abiElement: any) => abiElement.name === methodName
    )[0];

    const isConstant =
      abi !== undefined &&
      (abi.constant === true ||
        abi.stateMutability === "view" ||
        abi.stateMutability === "pure");

    const original = instance[methodName];
    const originalCall = original.call;
    const originalEstimateGas = original.estimateGas;

    instance[methodName] = async (...args: any[]) => {
      args = await this._ensureTxParamsWithDefaults(args, !isConstant);
      return original.apply(instance, args);
    };

    instance[methodName].call = async (...args: any[]) => {
      args = await this._ensureTxParamsWithDefaults(args, !isConstant);
      return originalCall.apply(originalCall, args);
    };

    instance[methodName].estimateGas = async (...args: any[]) => {
      args = await this._ensureTxParamsWithDefaults(args, !isConstant);
      return originalEstimateGas.apply(originalEstimateGas, args);
    };
  }

  private async _ensureTxParamsWithDefaults(
    args: any[],
    isDefaultAccountRequired = true
  ) {
    args = this._ensureTxParamsIsPresent(args);
    const txParams = args[args.length - 1];

    args[args.length - 1] = await this._addDefaultTxParams(
      txParams,
      isDefaultAccountRequired
    );

    return args;
  }

  private _ensureTxParamsIsPresent(args: any[]) {
    if (this._isLastArgumentTxParams(args)) {
      return args;
    }

    return [...args, {}];
  }

  private _isLastArgumentTxParams(args: any[]) {
    const lastArg = args[args.length - 1];
    return lastArg && Object.getPrototypeOf(lastArg) === Object.prototype;
  }

  private async _addDefaultTxParams(
    txParams: any,
    isDefaultAccountRequired = true
  ) {
    return {
      ...txParams,
      from: await this._getDefaultAccount(txParams, isDefaultAccountRequired)
    };
  }

  private async _getDefaultAccount(
    txParams: any,
    isDefaultAccountRequired = true
  ) {
    if (txParams.from !== undefined) {
      return txParams.from;
    }

    if (this._defaultAccount === undefined) {
      const getAccounts = this._web3.eth.getAccounts.bind(this._web3.eth);
      const accounts = await util.promisify(getAccounts)();

      if (accounts.length === 0) {
        if (isDefaultAccountRequired) {
          throw new BuidlerPluginError(
            "There's no account available in the selected network."
          );
        }

        return undefined;
      }

      this._defaultAccount = accounts[0];
    }

    return this._defaultAccount;
  }

  private _hookCloneCalls(Contract: TruffleContract, linker: Linker) {
    const originalClone = Contract.clone;

    Contract.clone = (...args: any[]) => {
      const cloned = originalClone.apply(Contract, args);

      return this.provision(cloned, linker);
    };
  }
}
