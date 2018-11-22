import path from "path";
import util from "util";
import {
  BuidlerConfig,
  NetworkConfig,
  TruffleContract,
  TruffleContractInstance
} from "../types";
import { BuidlerError, ERRORS } from "./errors";
import { glob } from "../util/glob";

export class TruffleArtifactsStorage {
  private readonly _artifactsPath: string;

  constructor(artifactsPath: string) {
    this._artifactsPath = artifactsPath;
  }

  async saveTruffleArtifacts(compilationOutput: any) {
    for (const [globalFileName, fileContracts] of Object.entries(
      compilationOutput.contracts
    )) {
      for (const [contractName, contract] of Object.entries(fileContracts)) {
        await this._saveTruffleArtifact(contractName, contract);
      }
    }
  }

  async _saveTruffleArtifact(contractName: string, contract: any) {
    const fsExtra = await import("fs-extra");
    const truffleDir = path.join(this._artifactsPath, "truffle");
    await fsExtra.ensureDir(truffleDir);

    const bytecode =
      (contract.evm && contract.evm.bytecode && contract.evm.bytecode.object) ||
      "";

    const artifact = {
      contractName,
      abi: contract.abi,
      bytecode,
      linkReferences:
        contract.evm &&
        contract.evm.bytecode &&
        contract.evm.bytecode.linkReferences
    };

    await fsExtra.outputJSON(
      path.join(truffleDir, contractName + ".json"),
      artifact,
      {
        spaces: 2
      }
    );
  }

  getTruffleArtifact(contractName: string) {
    const fsExtra = require("fs-extra");
    const artifactPath = path.join(
      this._artifactsPath,
      "truffle",
      `${contractName}.json`
    );

    if (!fsExtra.pathExistsSync(artifactPath)) {
      throw new BuidlerError(ERRORS.TRUFFLE_ARTIFACT_NOT_FOUND, contractName);
    }

    return fsExtra.readJsonSync(artifactPath);
  }

  async getAllArtifacts() {
    const fsExtra = await import("fs-extra");
    const artifactsGlob = path.join(this._artifactsPath, "truffle", "*.json");
    const artifactFiles = await glob(artifactsGlob);

    return Promise.all(artifactFiles.map((f: string) => fsExtra.readJson(f)));
  }
}

class LazyTruffleContractProvisioner {
  private _web3: any;
  private _networkConfig: NetworkConfig;
  private _artifacts: TruffleEnvironmentArtifacts;
  private _defaultAccount?: string;
  constructor(
    config: BuidlerConfig,
    web3: any,
    selectedNetworkConfig: NetworkConfig,
    artifacts: TruffleEnvironmentArtifacts
  ) {
    this._web3 = web3;
    this._networkConfig = selectedNetworkConfig;
    this._artifacts = artifacts;
  }

  provision(Contract: TruffleContract) {
    Contract.setProvider(this._web3.currentProvider);
    this._addContractDeploymentGasEstimation(Contract);
    this._addDefaultParamsHooks(Contract);
  }

  _addContractDeploymentGasEstimation(Contract: TruffleContract) {
    const originalNew = Contract.new;

    Contract.new = async (...args: any[]) => {
      this._ensureTxParamsIsPresent(args);
      const txParams = args[args.length - 1];

      if (txParams.gas === undefined) {
        txParams.gas = await this._estimateDeploymentGas(Contract, args);
      }

      return originalNew.apply(Contract, args);
    };
  }

  async _estimateDeploymentGas(Contract: TruffleContract, params: any[]) {
    await Contract.detectNetwork();

    if (
      this._artifacts.contractNeedsLinking(Contract) &&
      !this._artifacts.contractWasLinked(Contract)
    ) {
      throw new BuidlerError(
        ERRORS.TRUFFLE_CONTRACT_NOT_LINKED,
        Contract.contractName
      );
    }

    const constructorParams = params.slice(0, params.length - 1);
    const txParams = params[params.length - 1];

    const data = this._web3.eth
      .contract(Contract.abi)
      .new.getData(...constructorParams, {
        ...txParams,
        data: Contract.binary
      });

    const estimateGas = this._web3.eth.estimateGas.bind(this._web3.eth);
    return util.promisify(estimateGas)({ ...txParams, data });
  }

  _isLastArgumentTxParams(args: any[]) {
    const lastArg = args[args.length - 1];
    return lastArg && Object.getPrototypeOf(lastArg) === Object.prototype;
  }

  _addDefaultParamsHooks(Contract: TruffleContract) {
    const originalNew = Contract.new;
    const originalAt = Contract.at;

    Contract.new = async (...args: any[]) => {
      await this._ensureTxParamsWithDefaults(Contract, args);

      const contractInstance = await originalNew.apply(Contract, args);

      this._addDefaultParamsToAllInstanceMethods(Contract, contractInstance);

      return contractInstance;
    };

    Contract.at = (...args: any[]) => {
      const contractInstance = originalAt.apply(Contract, args);

      this._addDefaultParamsToAllInstanceMethods(Contract, contractInstance);

      return contractInstance;
    };
  }

  _addDefaultParamsToAllInstanceMethods(
    Contract: TruffleContract,
    contractInstance: TruffleContractInstance
  ) {
    this._getContractInstanceMethodsToOverride(Contract).map(name =>
      this._addDefaultParamsToInstanceMethod(Contract, contractInstance, name)
    );
  }

  _getContractInstanceMethodsToOverride(Contract: TruffleContract) {
    const DEFAULT_INSTANCE_METHODS_TO_OVERRIDE = ["sendTransaction"];

    const abiFunctions = Contract.abi
      .filter((item: any) => item.type === "function")
      .map((item: any) => item.name);

    return [...DEFAULT_INSTANCE_METHODS_TO_OVERRIDE, ...abiFunctions];
  }

  _addDefaultParamsToInstanceMethod(
    Contract: TruffleContract,
    instance: TruffleContractInstance,
    methodName: string
  ) {
    const original = instance[methodName];
    const originalCall = original.call;
    const originalEstimateGas = original.estimateGas;

    instance[methodName] = async (...args: any[]) => {
      await this._ensureTxParamsWithDefaults(Contract, args);
      return original.apply(instance, args);
    };

    instance[methodName].call = async (...args: any[]) => {
      await this._ensureTxParamsWithDefaults(Contract, args);
      return originalCall.apply(originalCall, args);
    };

    instance[methodName].estimateGas = async (...args: any[]) => {
      await this._ensureTxParamsWithDefaults(Contract, args);
      return originalEstimateGas.apply(originalEstimateGas, args);
    };
  }

  async _ensureTxParamsWithDefaults(Contract: TruffleContract, args: any[]) {
    this._ensureTxParamsIsPresent(args);
    const txParams = args[args.length - 1];

    args[args.length - 1] = await this._addAllDefaultParams(Contract, txParams);
  }

  _ensureTxParamsIsPresent(args: any[]) {
    if (!this._isLastArgumentTxParams(args)) {
      args.push({});
    }
  }

  async _addAllDefaultParams(Contract: TruffleContract, txParams: any) {
    const withDefaults = this._addDefaultParamsFromConfig(Contract, txParams);
    withDefaults.from = await this._getResolvedFromParam(withDefaults);
    return withDefaults;
  }

  _addDefaultParamsFromConfig(Contract: TruffleContract, txParams: any) {
    const networkConfigParams: Partial<NetworkConfig> = {};

    if (this._networkConfig.from !== undefined) {
      networkConfigParams.from = this._networkConfig.from;
    }

    if (this._networkConfig.gas !== undefined) {
      networkConfigParams.gas = this._networkConfig.gas;
    }

    if (this._networkConfig.gasPrice !== undefined) {
      networkConfigParams.gasPrice = this._networkConfig.gasPrice;
    }

    return Object.assign(
      networkConfigParams,
      Contract.class_defaults,
      txParams
    );
  }

  async _getResolvedFromParam(txParamsWithDefaults: any) {
    if (txParamsWithDefaults.from !== undefined) {
      return txParamsWithDefaults.from;
    }

    if (this._defaultAccount === undefined) {
      const getAccounts = this._web3.eth.getAccounts.bind(this._web3.eth);
      const accounts = await util.promisify(getAccounts)();
      this._defaultAccount = accounts[0];
    }

    return this._defaultAccount;
  }
}

export class TruffleEnvironmentArtifacts {
  private _storage: TruffleArtifactsStorage;
  private _provisioner: LazyTruffleContractProvisioner;
  constructor(
    config: BuidlerConfig,
    web3: any,
    selectedNetworkConfig: NetworkConfig
  ) {
    this._storage = new TruffleArtifactsStorage(config.paths.artifacts);
    this._provisioner = new LazyTruffleContractProvisioner(
      config,
      web3,
      selectedNetworkConfig,
      this
    );
  }

  require(contractPath: string) {
    const name = this._getContractNameFromPath(contractPath);
    return this._getTruffleContract(name);
  }

  contractNeedsLinking(Contract: TruffleContract) {
    return Contract.bytecode.includes("__");
  }

  contractWasLinked(Contract: TruffleContract) {
    try {
      if (Contract.binary.includes("__")) {
        return false;
      }
    } catch (e) {
      return false;
    }

    return true;
  }

  link(destination: TruffleContract, ...libraries: TruffleContractInstance[]) {
    if (libraries.length === 0) {
      return;
    }

    for (const library of libraries) {
      if (
        library.address === undefined ||
        library.constructor.network_id === undefined
      ) {
        throw new BuidlerError(
          ERRORS.TRUFFLE_LIBRARY_NOT_DEPLOYED,
          destination.contractName,
          library.constructor.contractName
        );
      }
    }

    const destinationArtifact = this._storage.getTruffleArtifact(
      destination.contractName
    );

    const libraryAddresses: any = {};

    const linkReferences = destinationArtifact.linkReferences;

    for (const file of Object.keys(linkReferences)) {
      for (const contractName of Object.keys(linkReferences[file])) {
        const library = libraries.find(
          c => c.constructor.contractName === contractName
        );

        if (library !== undefined) {
          const libraryIdentifier = `${file}:${contractName}`.slice(0, 36);
          libraryAddresses[libraryIdentifier] = library.address;
        }
      }
    }

    // We never save the network_id's nor change them, so they are all the same
    destination.setNetwork(libraries[0].constructor.network_id);
    destination.link(libraryAddresses);
  }

  _getContractNameFromPath(contractPath: string) {
    const basename = path.basename(contractPath);

    const lastDotIndex = basename.lastIndexOf(".");
    if (lastDotIndex === -1) {
      return basename;
    }

    return basename.slice(0, lastDotIndex);
  }

  _getTruffleContract(contractName: string) {
    const artifact = this._storage.getTruffleArtifact(contractName);
    const TruffleContractFactory = require("truffle-contract");
    const Contract = TruffleContractFactory(artifact);

    this._provisioner.provision(Contract);

    return Contract;
  }
}
