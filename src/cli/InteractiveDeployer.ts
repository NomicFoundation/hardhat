import { BuidlerConfig, TruffleContractInstance } from "../types";
import { TruffleArtifactsStorage } from "../core/truffle";
import { artifacts, pweb3 } from "../injected-env";

// TODO: This imports are outdated, import-lazy shouldn't ne used anymore.
const importLazy = require("import-lazy")(require);
const inquirer = importLazy("inquirer");
const chalk = importLazy("chalk");
const ethUtil = importLazy("ethereumjs-util");
const BigNumber = importLazy("bignumber.js");

const { BuidlerError, ERRORS } = require("../core/errors");

const ACCOUNTS_ADDRESS_MODE = "accounts";
const DEPLOYED_CONTRACT_ADDRESS_MODE = "deployed_contract";
const DEPLOYED_LIBRARY_ADDRESS_MODE = "deployed_library";
const DEPLOY_NEW_LIBRARY_ADDRESS_MODE = "new_library";
const OTHER_ADDRESS_MODE = "input";

export class InteractiveDeployer {
  private _artifactsStorage: TruffleArtifactsStorage;
  private readonly _showStackTraces: boolean;
  private readonly _fromAddress?: string;
  private _deployedContracts: TruffleContractInstance[];
  private _deployedContractsMap: {
    [contractName: string]: TruffleContractInstance[];
  };
  private _deployableArtifacts?: any[];
  private _deployableArtifactsMap?: { [contractName: string]: any };
  private _accounts?: string[];

  constructor(
    config: BuidlerConfig,
    showStackTraces: boolean,
    fromAddress?: string
  ) {
    this._artifactsStorage = new TruffleArtifactsStorage(
      config.paths.artifacts
    );

    this._showStackTraces = showStackTraces;
    this._fromAddress = fromAddress;
    this._deployedContracts = [];
    this._deployedContractsMap = {};
  }

  async run() {
    await this._validateFromAddress();

    this._deployedContracts = [];
    this._deployedContractsMap = {};

    do {
      const contractName = await this._selectContractToDeploy();

      const contract = await this._deployContract(contractName);

      if (contract !== undefined) {
        console.log(
          chalk.green.bold(`${contractName} was deployed at`),
          ethUtil.toChecksumAddress(contract.address)
        );
      }
    } while (await this._shouldDeployAnotherContract());
  }

  async _selectContractToDeploy() {
    const deployableArtifacts = await this._getDeployableArtifacts();
    const contractNames = deployableArtifacts.map(a => a.contractName);

    const { contractName } = await inquirer.prompt([
      {
        name: "contractName",
        type: "list",
        message: "Which contract do you want to deploy?",
        choices: contractNames
      }
    ]);

    return contractName;
  }

  // Returns undefined if the user cancels the deployment.
  async _deployContract(
    contractName: string
  ): Promise<TruffleContractInstance> {
    const artifact = await this._getDeployableArtifact(contractName);

    const args = await this._getConstructorArgs(artifact);

    const libraries = this._usesLibraries(artifact)
      ? await this._getLibraries(artifact)
      : undefined;

    const { confirmDeployment } = await inquirer.prompt([
      {
        name: "confirmDeployment",
        type: "confirm",
        message: `Confirm deployment of ${contractName}`
      }
    ]);

    if (!confirmDeployment) {
      return;
    }

    let contract = await this._deploy(contractName, args, libraries);

    if (contract === undefined) {
      return;
    }

    this._deployedContracts.push(contract);
    if (this._deployedContractsMap[contractName] === undefined) {
      this._deployedContractsMap[contractName] = [];
    }

    this._deployedContractsMap[contractName].push(contract);

    return contract;
  }

  async _deploy(
    contractName: string,
    args: any[],
    libraries?: TruffleContractInstance[]
  ) {
    const ora = require("ora");
    const spinner = ora(`Deploying ${contractName}`, { color: "cyan" }).start();

    const Contract = artifacts.require(contractName);

    if (libraries !== undefined) {
      await artifacts.link(Contract, ...libraries);
    }

    try {
      if (this._fromAddress !== undefined) {
        args = [...args, { from: this._fromAddress }];
      }

      return await Contract.new(...args);
    } catch (e) {
      if (e.message.includes("VM Exception")) {
        console.error(chalk.red(`Error deploying ${contractName}:`, e.message));

        console.error(
          chalk.red("Make sure the constructor's requires are met")
        );

        if (this._showStackTraces) {
          console.error(e);
        }

        return;
      }

      throw e;
    } finally {
      spinner.stop();
    }
  }

  async _getDeployableArtifacts() {
    if (this._deployableArtifacts === undefined) {
      const artifacts = await this._artifactsStorage.getAllArtifacts();

      this._deployableArtifacts = artifacts.filter(a => this._isDeployable(a));
    }

    return this._deployableArtifacts;
  }

  _isDeployable(artifact: any) {
    // An artifact without bytecode is an abstract contract or interface
    //
    // And we don't bother with libaries/coontracts with empty ABIs, if not
    // things like SafeMath will shown.

    return artifact.bytecode.length > 0 && artifact.abi.length > 0;
  }

  async _getDeployableArtifact(contractName: string) {
    if (this._deployableArtifactsMap === undefined) {
      const deployableArtifacts = await this._getDeployableArtifacts();

      this._deployableArtifactsMap = {};
      for (const artifact of deployableArtifacts) {
        this._deployableArtifactsMap[artifact.contractName] = artifact;
      }
    }

    return this._deployableArtifactsMap[contractName];
  }

  async _shouldDeployAnotherContract() {
    console.log("");

    const { deployAnother } = await inquirer.prompt([
      {
        name: "deployAnother",
        type: "confirm",
        message: "Do you want to deploy another contract?"
      }
    ]);

    return deployAnother;
  }

  async _getConstructorArgs(artifact: any) {
    const constructor = artifact.abi.find(
      (elem: any) => elem.type === "constructor"
    );

    if (constructor === undefined || constructor.inputs.length === 0) {
      return [];
    }

    this._printTitle("Constructor arguments needed");

    const values = [];
    for (const input of constructor.inputs) {
      values.push(await this._getArgumentValue(input));
    }

    return values;
  }

  async _getArgumentValue(input: any) {
    if (input.type === "address") {
      return this._getValueForAddressInput(input);
    }

    if (input.type === "uint256") {
      return this._getValueForUint256(input);
    }

    if (input.type === "int256") {
      return this._getValueForInt256(input);
    }

    return this._getValueFor(input);
  }

  async _getValueFor<T>(
    input: any,
    validationFunction?: (input: any, answers?: T) => boolean | string
  ) {
    const { value } = await inquirer.prompt([
      {
        name: "value",
        message: `Insert a value for ${chalk.grey(
          input.type + " " + input.name
        )}:`,
        type: "input",
        validate: validationFunction
      }
    ]);

    return value;
  }

  _getValueForUint256(input: any) {
    return this._getValueFor(input, str => {
      const bn = new BigNumber(str);

      if (bn.isNaN()) {
        return "Invalid number";
      }

      if (!bn.isInteger()) {
        return "Number must be an integer";
      }

      if (bn.lt(0)) {
        return "Number must be non-negative";
      }

      return true;
    });
  }

  _getValueForInt256(input: any) {
    return this._getValueFor(input, str => {
      const bn = new BigNumber(str);

      if (bn.isNaN()) {
        return "Invalid number";
      }

      if (!bn.isInteger()) {
        return "Number must be an integer";
      }

      return true;
    });
  }

  async _getValueForAddressInput(input: any) {
    return this._getAddress(
      `Insert a value for ${chalk.grey(input.type + " " + input.name)}:`,
      true
    );
  }

  async _getAccounts(): Promise<string[]> {
    if (this._accounts !== undefined) {
      return this._accounts;
    }

    const accounts = await pweb3.eth.getAccounts();
    this._accounts = accounts.map((acc: string) =>
      ethUtil.toChecksumAddress(acc)
    );

    return accounts;
  }

  _usesLibraries(artifact: any) {
    return Object.keys(artifact.linkReferences).length > 0;
  }

  async _getLibraries(artifact: any) {
    const libraries = [];

    for (const libName of this._getNeededLibraryNames(artifact)) {
      libraries.push(await this._getLibrary(artifact.contractName, libName));
    }

    return libraries;
  }

  _getNeededLibraryNames(artifact: any) {
    const names = [];

    for (const file of Object.values(artifact.linkReferences)) {
      for (const name of Object.keys(file)) {
        names.push(name);
      }
    }

    return names.sort();
  }

  async _getLibrary(contractName: string, libraryName: string) {
    console.log("");
    this._printTitle(`${contractName} uses library ${libraryName}`);

    const address = await this._getAddress(
      `What do you want to do?`,
      false,
      false,
      libraryName
    );

    console.log("");

    const Library = artifacts.require(libraryName);

    return Library.at(address);
  }

  _getDeployedContractsByName(name?: string): TruffleContractInstance[] {
    if (name === undefined) {
      return [];
    }

    return this._deployedContractsMap[name] || [];
  }

  async _getAddress(
    modeSelectionPrompt: any,
    useAccounts = false,
    canBeNullAddress = true,
    libraryName?: string
  ) {
    const deployed = this._getDeployedContractsByName(libraryName);

    if (deployed && deployed.length === 1) {
      const library = deployed[0];
      const libraryAddress = ethUtil.toChecksumAddress(library.address);
      const { useTheOnlyOne } = await inquirer.prompt([
        {
          name: "useTheOnlyOne",
          type: "confirm",
          message: `You already deployed it at ${chalk.reset.cyan(
            libraryAddress
          )}. Do you want to use it?`
        }
      ]);

      if (useTheOnlyOne) {
        return libraryAddress;
      }
    }

    const mode = await this._getAddressMode(
      modeSelectionPrompt,
      useAccounts,
      libraryName
    );

    if (mode === ACCOUNTS_ADDRESS_MODE) {
      return this._getAddressFromAccounts();
    }

    if (mode === DEPLOYED_CONTRACT_ADDRESS_MODE) {
      return this._getAddressFromDeployedContracts(this._deployedContracts);
    }

    if (mode === DEPLOYED_LIBRARY_ADDRESS_MODE) {
      return this._getAddressFromDeployedContracts(deployed);
    }

    if (mode === DEPLOY_NEW_LIBRARY_ADDRESS_MODE && libraryName !== undefined) {
      return this._getAddressFromNewLibrary(libraryName);
    }

    return this._getOtherAddress(canBeNullAddress);
  }

  async _getAddressMode(
    modeSelectionPrompt: any,
    useAccounts: boolean,
    libraryName?: string
  ) {
    const modeChoices = [];

    if (useAccounts) {
      modeChoices.push({
        name: "Use one of your accounts",
        value: ACCOUNTS_ADDRESS_MODE
      });
    }

    if (libraryName === undefined) {
      if (this._deployedContracts.length > 0) {
        modeChoices.push({
          name: "Use a contract deployed in this session",
          value: DEPLOYED_CONTRACT_ADDRESS_MODE
        });
      }
    } else {
      const deployed = this._getDeployedContractsByName(libraryName);

      if (deployed.length > 1) {
        if (this._deployedContracts.length > 0) {
          modeChoices.push({
            name: `Use a version of ${libraryName} deployed in this session`,
            value: DEPLOYED_LIBRARY_ADDRESS_MODE
          });
        }
      }

      modeChoices.push({
        name: `Deploy a new version of ${libraryName}`,
        value: DEPLOY_NEW_LIBRARY_ADDRESS_MODE
      });
    }

    modeChoices.push({
      name: "Use another address",
      value: OTHER_ADDRESS_MODE
    });

    const { mode } = await inquirer.prompt([
      {
        name: "mode",
        type: "list",
        message: modeSelectionPrompt,
        choices: modeChoices
      }
    ]);

    return mode;
  }

  async _getAddressFromAccounts() {
    const accounts = await this._getAccounts();
    const { value } = await inquirer.prompt([
      {
        name: "value",
        message: `Choose an account:`,
        type: "list",
        pageSize: accounts.length,
        choices: accounts.map((acc, i) => ({
          name: `account[${i}]: ${acc}`,
          value: acc
        }))
      }
    ]);

    return value;
  }

  async _getAddressFromDeployedContracts(contracts: TruffleContractInstance[]) {
    const { value } = await inquirer.prompt([
      {
        name: "value",
        message: `Choose a contract:`,
        type: "list",
        pageSize: Math.min(contracts.length, 10),
        choices: contracts.map(c => ({
          name: `${c.constructor.contractName} @ ${ethUtil.toChecksumAddress(
            c.address
          )}`,
          value: ethUtil.toChecksumAddress(c.address)
        }))
      }
    ]);

    return value;
  }

  async _getAddressFromNewLibrary(libraryName: string) {
    this._printTitle(`Deploying library ${libraryName}`);

    while (true) {
      const library = await this._deployContract(libraryName);

      if (library !== undefined) {
        const address = ethUtil.toChecksumAddress(library.address);

        console.log(
          chalk.green(">"),
          chalk.bold(`${libraryName} was deployed at`),
          chalk.cyan(address)
        );

        return address;
      }
    }
  }

  async _getOtherAddress(canBeNullAddress: boolean) {
    while (true) {
      const { value } = await inquirer.prompt([
        {
          name: "value",
          message: `Insert an address:`,
          type: "input",
          validate: (str: string) => {
            if (str.match(/^(?:0x)?0{1,40}$/) && !canBeNullAddress) {
              return "Address can't be null";
            }

            if (!ethUtil.isValidAddress(str)) {
              return "Invalid address";
            }

            return true;
          }
        }
      ]);

      if (value === value.toLowerCase()) {
        const { useAnyway } = await inquirer.prompt([
          {
            name: "useAnyway",
            type: "confirm",
            message:
              "The address is not checksummed. Do you want to use it anyway?"
          }
        ]);

        if (useAnyway) {
          return value;
        }
      } else if (!ethUtil.isValidChecksumAddress(value)) {
        console.log(chalk.red("Invalid address checksum."));
      } else {
        return value;
      }
    }
  }

  _printTitle(title: string) {
    console.log(chalk.cyan(">"), chalk.bold(title));
  }

  async _validateFromAddress() {
    if (this._fromAddress === undefined) {
      return;
    }

    if (!ethUtil.isValidAddress(this._fromAddress)) {
      throw new BuidlerError(
        ERRORS.INTERACTIVE_DEPLOYER_INVALID_FROM,
        this._fromAddress
      );
    }

    const checksummed = ethUtil.toChecksumAddress(this._fromAddress);

    const accounts = await this._getAccounts();

    if (!accounts.includes(checksummed)) {
      throw new BuidlerError(ERRORS.INTERACTIVE_DEPLOYER_FROM_NOT_MANAGED);
    }
  }
}
