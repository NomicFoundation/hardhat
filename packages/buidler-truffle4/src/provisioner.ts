import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import util from "util";

import { Linker, TruffleContract, TruffleContractInstance } from "./types";

export class LazyTruffleContractProvisioner {
  constructor(private readonly web3: any, private defaultAccount?: string) {}

  public provision(Contract: TruffleContract, linker: Linker) {
    Contract.setProvider(this.web3.currentProvider);
    this.addDefaultParamsHooks(Contract, linker);
    this.hookCloneCalls(Contract, linker);

    return new Proxy(Contract, {
      construct(target, argumentsList, newTarget) {
        if (argumentsList.length > 0 && typeof argumentsList[0] === "string") {
          return target.at(argumentsList[0]);
        }

        return Reflect.construct(target, argumentsList, newTarget);
      }
    });
  }

  private addDefaultParamsHooks(Contract: TruffleContract, linker: Linker) {
    const originalNew = Contract.new;
    const originalAt = Contract.at;
    const originalLink = Contract.link;

    Contract.new = async (...args: any[]) => {
      args = await this.ensureTxParamsWithDefaults(args);

      const contractInstance = await originalNew.apply(Contract, args);

      this.addDefaultParamsToAllInstanceMethods(Contract, contractInstance);

      return contractInstance;
    };

    Contract.at = (...args: any[]) => {
      const contractInstance = originalAt.apply(Contract, args);

      this.addDefaultParamsToAllInstanceMethods(Contract, contractInstance);

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

  private addDefaultParamsToAllInstanceMethods(
    Contract: TruffleContract,
    contractInstance: TruffleContractInstance
  ) {
    this.getContractInstanceMethodsToOverride(Contract).forEach(name =>
      this.addDefaultParamsToInstanceMethod(contractInstance, name)
    );
  }

  private getContractInstanceMethodsToOverride(Contract: TruffleContract) {
    const DEFAULT_INSTANCE_METHODS_TO_OVERRIDE = ["sendTransaction"];

    const abiFunctions = Contract.abi
      .filter((item: any) => item.type === "function")
      .map((item: any) => item.name);

    return [...DEFAULT_INSTANCE_METHODS_TO_OVERRIDE, ...abiFunctions];
  }

  private addDefaultParamsToInstanceMethod(
    instance: TruffleContractInstance,
    methodName: string
  ) {
    const original = instance[methodName];
    const originalCall = original.call;
    const originalEstimateGas = original.estimateGas;

    instance[methodName] = async (...args: any[]) => {
      args = await this.ensureTxParamsWithDefaults(args);
      return original.apply(instance, args);
    };

    instance[methodName].call = async (...args: any[]) => {
      args = await this.ensureTxParamsWithDefaults(args);
      return originalCall.apply(originalCall, args);
    };

    instance[methodName].estimateGas = async (...args: any[]) => {
      args = await this.ensureTxParamsWithDefaults(args);
      return originalEstimateGas.apply(originalEstimateGas, args);
    };
  }

  private async ensureTxParamsWithDefaults(args: any[]) {
    args = this.ensureTxParamsIsPresent(args);
    const txParams = args[args.length - 1];

    args[args.length - 1] = await this.addDefaultTxParams(txParams);

    return args;
  }

  private ensureTxParamsIsPresent(args: any[]) {
    if (this.isLastArgumentTxParams(args)) {
      return args;
    }

    return [...args, {}];
  }

  private isLastArgumentTxParams(args: any[]) {
    const lastArg = args[args.length - 1];
    return lastArg && Object.getPrototypeOf(lastArg) === Object.prototype;
  }

  private async addDefaultTxParams(txParams: any) {
    return {
      ...txParams,
      from: await this.getDefaultAccount(txParams)
    };
  }

  private async getDefaultAccount(txParams: any) {
    if (txParams.from !== undefined) {
      return txParams.from;
    }

    if (this.defaultAccount === undefined) {
      const getAccounts = this.web3.eth.getAccounts.bind(this.web3.eth);
      const accounts = await util.promisify(getAccounts)();

      if (accounts.length === 0) {
        throw new BuidlerPluginError(
          "There's no account available in the selected network."
        );
      }

      this.defaultAccount = accounts[0];
    }

    return this.defaultAccount;
  }

  private hookCloneCalls(Contract: TruffleContract, linker: Linker) {
    const originalClone = Contract.clone;

    Contract.clone = (...args: any[]) => {
      const cloned = originalClone.apply(Contract, args);

      return this.provision(cloned, linker);
    };
  }
}
