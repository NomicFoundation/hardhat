import type { wrapWithSolidityErrorsCorrection as WrapWithSolidityErrorsCorrectionT } from "hardhat/internal/hardhat-network/stack-traces/solidity-errors";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { NetworkConfig } from "hardhat/types";
import util from "util";

import { Linker, TruffleContract, TruffleContractInstance } from "./types";

export class LazyTruffleContractProvisioner {
  private readonly _web3: any;
  private _defaultAccount?: string;
  private readonly _deploymentAddresses: {
    [contractName: string]: string;
  } = {};

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
    this._hookCloneCalls(Contract, linker);
    this._setDefaultValues(Contract);
    this._addDefaultParamsHooks(Contract);
    this._hookLink(Contract, linker);
    this._hookDeployed(Contract);

    return new Proxy(Contract, {
      construct(target, argumentsList, newTarget) {
        if (argumentsList.length > 0 && typeof argumentsList[0] === "string") {
          return target.at(argumentsList[0]);
        }

        return Reflect.construct(target, argumentsList, newTarget);
      },
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

  private _addDefaultParamsHooks(Contract: TruffleContract) {
    const originalNew = Contract.new;
    const originalAt = Contract.at;

    const { wrapWithSolidityErrorsCorrection } =
      require("hardhat/internal/hardhat-network/stack-traces/solidity-errors") as {
        wrapWithSolidityErrorsCorrection: typeof WrapWithSolidityErrorsCorrectionT;
      };

    Contract.new = async (...args: any[]) => {
      return wrapWithSolidityErrorsCorrection(async () => {
        args = await this._ensureTxParamsWithDefaults(args);

        const contractInstance = await originalNew.apply(Contract, args);

        this._addDefaultParamsToAllInstanceMethods(Contract, contractInstance);

        return contractInstance;
      }, 3);
    };

    Contract.at = (...args: any[]) => {
      const contractInstance = originalAt.apply(Contract, args);
      contractInstance.then = (resolve: any, reject: any) => {
        delete contractInstance.then;
        Promise.resolve(contractInstance).then(resolve, reject);
      };

      this._addDefaultParamsToAllInstanceMethods(Contract, contractInstance);

      return contractInstance;
    };
  }

  private _hookLink(Contract: TruffleContract, linker: Linker) {
    const originalLink = Contract.link;

    const alreadyLinkedLibs: { [libName: string]: boolean } = {};
    let linkingByInstance = false;

    Contract.link = (...args: any[]) => {
      // This is a simple way to detect if it is being called with a contract as first argument.
      if (args[0].constructor.name === "TruffleContract") {
        const libName = args[0].constructor.contractName;

        if (alreadyLinkedLibs[libName]) {
          throw new NomicLabsHardhatPluginError(
            "@nomiclabs/hardhat-truffle4",
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
            "@nomiclabs/hardhat-truffle4",
            `Linking contracts by name is not supported by Hardhat. Please use ${Contract.contractName}.link(libraryInstance) instead.`
          );
        }

        throw new NomicLabsHardhatPluginError(
          "@nomiclabs/hardhat-truffle4",
          `Linking contracts with a map of addresses is not supported by Hardhat. Please use ${Contract.contractName}.link(libraryInstance) instead.`
        );
      }

      originalLink.apply(Contract, args);
    };
  }

  private _addDefaultParamsToAllInstanceMethods(
    Contract: TruffleContract,
    contractInstance: TruffleContractInstance
  ) {
    this._getContractInstanceMethodsToOverride(Contract).forEach((name) =>
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
    const originalSendTransaction = original.sendTransaction;
    const originalRequest = original.request;

    const { wrapWithSolidityErrorsCorrection } =
      require("hardhat/internal/hardhat-network/stack-traces/solidity-errors") as {
        wrapWithSolidityErrorsCorrection: typeof WrapWithSolidityErrorsCorrectionT;
      };

    instance[methodName] = async (...args: any[]) => {
      return wrapWithSolidityErrorsCorrection(async () => {
        args = await this._ensureTxParamsWithDefaults(args, !isConstant);
        return original.apply(instance, args);
      }, 3);
    };

    instance[methodName].call = async (...args: any[]) => {
      return wrapWithSolidityErrorsCorrection(async () => {
        args = await this._ensureTxParamsWithDefaults(args, !isConstant);
        return originalCall.apply(original, args);
      }, 3);
    };

    instance[methodName].estimateGas = async (...args: any[]) => {
      return wrapWithSolidityErrorsCorrection(async () => {
        args = await this._ensureTxParamsWithDefaults(args, !isConstant);
        return originalEstimateGas.apply(original, args);
      }, 3);
    };

    instance[methodName].sendTransaction = async (...args: any[]) => {
      return wrapWithSolidityErrorsCorrection(async () => {
        args = await this._ensureTxParamsWithDefaults(args, !isConstant);
        return originalSendTransaction.apply(original, args);
      }, 3);
    };

    instance[methodName].request = (...args: any[]) => {
      return originalRequest.apply(original, args);
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
      from: await this._getDefaultAccount(txParams, isDefaultAccountRequired),
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
          throw new NomicLabsHardhatPluginError(
            "@nomiclabs/hardhat-truffle4",
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

  private _hookDeployed(Contract: TruffleContract) {
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
  }
}
