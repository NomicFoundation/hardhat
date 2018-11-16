"use strict";

const importLazy = require("import-lazy")(require);

const path = require("path");
const fs = importLazy("fs-extra");
const util = require("util");
const glob = util.promisify(require("glob"));
const TruffleContract = importLazy("truffle-contract");
const { BuidlerError, ERRORS } = require("./errors");

export class TruffleArtifactsStorage {
  constructor(artifactsPath) {
    this._artifactsPath = artifactsPath;
  }

  async saveTruffleArtifacts(compilationOutput) {
    for (const [globalFileName, fileContracts] of Object.entries(
      compilationOutput.contracts
    )) {
      for (const [contractName, contract] of Object.entries(fileContracts)) {
        await this._saveTruffleArtifact(contractName, contract);
      }
    }
  }

  async _saveTruffleArtifact(contractName, contract) {
    const truffleDir = path.join(this._artifactsPath, "truffle");
    await fs.ensureDir(truffleDir);

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

    await fs.outputJSON(
      path.join(truffleDir, contractName + ".json"),
      artifact,
      {
        spaces: 2
      }
    );
  }

  getTruffleArtifact(contractName) {
    const artifactPath = path.join(
      this._artifactsPath,
      "truffle",
      `${contractName}.json`
    );

    if (!fs.pathExistsSync(artifactPath)) {
      throw new BuidlerError(ERRORS.TRUFFLE_ARTIFACT_NOT_FOUND, contractName);
    }

    return fs.readJsonSync(artifactPath);
  }

  async getAllArtifacts() {
    const artifactsGlob = path.join(this._artifactsPath, "truffle", "*.json");
    const artifactFiles = await glob(artifactsGlob);

    return Promise.all(artifactFiles.map(f => fs.readJson(f)));
  }
}

class LazyTruffleContractProvisioner {
  constructor(config, web3, selectedNetworkConfig, artifacts) {
    this._web3 = web3;
    this._networkConfig = selectedNetworkConfig;
    this._artifacts = artifacts;
  }

  provision(Contract) {
    Contract.setProvider(this._web3.currentProvider);
    this._addContractDeploymentGasEstimation(Contract);
    this._addDefaultParamsHooks(Contract);
  }

  _addContractDeploymentGasEstimation(Contract) {
    const originalNew = Contract.new;

    Contract.new = async (...args) => {
      this._ensureTxParamsIsPresent(args);
      const txParams = args[args.length - 1];

      if (txParams.gas === undefined) {
        txParams.gas = await this._estimateDeploymentGas(Contract, args);
      }

      return originalNew.apply(Contract, args);
    };
  }

  async _estimateDeploymentGas(Contract, params) {
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

  _isLastArgumentTxParams(args) {
    const lastArg = args[args.length - 1];
    return lastArg && Object.getPrototypeOf(lastArg) === Object.prototype;
  }

  _addDefaultParamsHooks(Contract) {
    const originalNew = Contract.new;
    const originalAt = Contract.at;

    Contract.new = async (...args) => {
      await this._ensureTxParamsWithDefaults(Contract, args);

      const contractInstance = await originalNew.apply(Contract, args);

      this._addDefaultParamsToAllInstanceMethods(Contract, contractInstance);

      return contractInstance;
    };

    Contract.at = (...args) => {
      const contractInstance = originalAt.apply(Contract, args);

      this._addDefaultParamsToAllInstanceMethods(Contract, contractInstance);

      return contractInstance;
    };
  }

  _addDefaultParamsToAllInstanceMethods(Contract, contractInstance) {
    this._getContractInstanceMethodsToOverride(Contract).map(name =>
      this._addDefaultParamsToInstanceMethod(Contract, contractInstance, name)
    );
  }

  _getContractInstanceMethodsToOverride(Contract) {
    const DEFAULT_INSTANCE_METHODS_TO_OVERRIDE = ["sendTransaction"];

    const abiFunctions = Contract.abi
      .filter(item => item.type === "function")
      .map(item => item.name);

    return [...DEFAULT_INSTANCE_METHODS_TO_OVERRIDE, ...abiFunctions];
  }

  _addDefaultParamsToInstanceMethod(Contract, instance, methodName) {
    const original = instance[methodName];
    const originalCall = original.call;
    const originalEstimateGas = original.estimateGas;

    instance[methodName] = async (...args) => {
      await this._ensureTxParamsWithDefaults(Contract, args);
      return original.apply(instance, args);
    };

    instance[methodName].call = async (...args) => {
      await this._ensureTxParamsWithDefaults(Contract, args);
      return originalCall.apply(originalCall, args);
    };

    instance[methodName].estimateGas = async (...args) => {
      await this._ensureTxParamsWithDefaults(Contract, args);
      return originalEstimateGas.apply(originalEstimateGas, args);
    };
  }

  async _ensureTxParamsWithDefaults(Contract, args) {
    this._ensureTxParamsIsPresent(args);
    const txParams = args[args.length - 1];

    args[args.length - 1] = await this._addAllDefaultParams(Contract, txParams);
  }

  _ensureTxParamsIsPresent(args) {
    if (!this._isLastArgumentTxParams(args)) {
      args.push({});
    }
  }

  async _addAllDefaultParams(Contract, txParams) {
    const withDefaults = this._addDefaultParamsFromConfig(Contract, txParams);
    withDefaults.from = await this._getResolvedFromParam(withDefaults);
    return withDefaults;
  }

  _addDefaultParamsFromConfig(Contract, txParams) {
    const networkConfigParams = {};

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

  async _getResolvedFromParam(txParamsWithDefaults) {
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
  constructor(config, web3, selectedNetworkConfig) {
    this._storage = new TruffleArtifactsStorage(config.paths.artifacts);
    this._provisioner = new LazyTruffleContractProvisioner(
      config,
      web3,
      selectedNetworkConfig,
      this
    );
  }

  require(contractPath) {
    const name = this._getContractNameFromPath(contractPath);
    return this._getTruffleContract(name);
  }

  contractNeedsLinking(Contract) {
    return Contract.bytecode.includes("__");
  }

  contractWasLinked(Contract) {
    try {
      if (Contract.binary.includes("__")) {
        return false;
      }
    } catch (e) {
      return false;
    }

    return true;
  }

  link(destination, ...libraries) {
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

    const libraryAddresses = {};

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

  _getContractNameFromPath(contractPath) {
    const basename = path.basename(contractPath);

    const lastDotIndex = basename.lastIndexOf(".");
    if (lastDotIndex === -1) {
      return basename;
    }

    return basename.slice(0, lastDotIndex);
  }

  _getTruffleContract(contractName) {
    const artifact = this._storage.getTruffleArtifact(contractName);
    const Contract = TruffleContract(artifact);

    this._provisioner.provision(Contract);

    return Contract;
  }
}
