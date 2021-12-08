import { ethers } from "ethers";
import fsExtra from "fs-extra";
import { HardhatConfig, HardhatRuntimeEnvironment } from "hardhat/types";
import {
  Binding,
  DeploymentPlan,
  Ignition,
  UserModule,
  IgnitionDeployOptions,
  SerializedModuleResult,
} from "ignition";
import path from "path";

type HardhatEthers = HardhatRuntimeEnvironment["ethers"];
type HardhatPaths = HardhatConfig["paths"];

export class IgnitionWrapper {
  private _ignition: Ignition;
  private _chainId: number | undefined;

  constructor(
    services: any,
    private _ethers: HardhatEthers,
    private _isHardhatNetwork: boolean,
    private _paths: HardhatPaths,
    private _deployOptions: {
      pathToJournal: string | undefined;
      txPollingInterval: number;
    }
  ) {
    this._ignition = new Ignition(services);
  }

  public async deploy<T>(
    userModuleOrName: UserModule<T> | string
  ): Promise<Resolved<T>> {
    const [, resolvedOutputs] = await this.deployMany([userModuleOrName]);
    return resolvedOutputs[0];
  }

  public async deployMany(
    userModulesOrNames: Array<UserModule<any> | string>
  ): Promise<Array<Resolved<any>>> {
    const userModules: Array<UserModule<any>> = [];
    for (const userModuleOrName of userModulesOrNames) {
      const userModule: UserModule<any> =
        typeof userModuleOrName === "string"
          ? await this._getModule(userModuleOrName)
          : userModuleOrName;

      userModules.push(userModule);
    }

    const deployOptions: IgnitionDeployOptions = {
      ...this._deployOptions,
      getModuleResult: (moduleId) => this._getModuleResult(moduleId),
      saveModuleResult: (moduleId, moduleResult) =>
        this._saveModuleResult(moduleId, moduleResult),
    };

    const [deploymentResult, moduleOutputs] = await this._ignition.deploy(
      userModules,
      deployOptions
    );

    if (deploymentResult._kind === "hold") {
      const [moduleId, holdReason] = deploymentResult.holds;
      throw new Error(`Execution held for module '${moduleId}': ${holdReason}`);
    }

    if (deploymentResult._kind === "failure") {
      const [moduleId, failures] = deploymentResult.failures;

      let failuresMessage = "";
      for (const failure of failures) {
        failuresMessage += `  - ${failure.message}\n`;
      }

      throw new Error(
        `Execution failed for module '${moduleId}':\n\n${failuresMessage}`
      );
    }

    const resolvedOutputs: any = [];
    for (const moduleOutput of Object.values(moduleOutputs)) {
      const resolvedOutput: any = {};
      for (const [key, value] of Object.entries<any>(moduleOutput as any)) {
        const serializedBindingResult =
          deploymentResult.result[value.moduleId][value.id];

        if (
          serializedBindingResult._kind === "string" ||
          serializedBindingResult._kind === "number"
        ) {
          resolvedOutput[key] = serializedBindingResult;
        } else if (serializedBindingResult._kind === "tx") {
          resolvedOutput[key] = serializedBindingResult.value.hash;
        } else {
          const { abi, address } = serializedBindingResult.value;
          resolvedOutput[key] = await this._ethers.getContractAt(abi, address);
        }
      }
      resolvedOutputs.push(resolvedOutput);
    }

    return [deploymentResult, resolvedOutputs];
  }

  public async buildPlan(
    userModulesOrNames: Array<UserModule<any> | string>
  ): Promise<DeploymentPlan> {
    const userModules: Array<UserModule<any>> = [];
    for (const userModuleOrName of userModulesOrNames) {
      const userModule: UserModule<any> =
        typeof userModuleOrName === "string"
          ? await this._getModule(userModuleOrName)
          : userModuleOrName;

      userModules.push(userModule);
    }

    const plan = await this._ignition.buildPlan(userModules, {
      getModuleResult: (moduleId) => this._getModuleResult(moduleId),
    });

    return plan;
  }

  private async _getModule<T>(moduleId: string): Promise<UserModule<T>> {
    const ignitionFiles = fsExtra
      .readdirSync(this._paths.ignition)
      .filter((x) => !x.startsWith("."));

    for (const ignitionFile of ignitionFiles) {
      const pathToFile = path.resolve(this._paths.ignition, ignitionFile);

      const fileExists = await fsExtra.pathExists(pathToFile);
      if (!fileExists) {
        throw new Error(`Module ${pathToFile} doesn't exist`);
      }

      const userModule = require(pathToFile);
      const userModuleContent = userModule.default ?? userModule;

      if (userModuleContent.id === moduleId) {
        return userModuleContent;
      }
    }

    throw new Error(`No module with id ${moduleId}`);
  }

  private async _getModuleResult(
    moduleId: string
  ): Promise<SerializedModuleResult | undefined> {
    if (this._isHardhatNetwork) {
      return;
    }

    if (this._chainId === undefined) {
      const { chainId } = await this._ethers.provider.getNetwork();
      this._chainId = chainId;
    }

    const moduleResultPath = path.join(
      this._paths.deployments,
      String(this._chainId),
      `${moduleId}.json`
    );

    if (!(await fsExtra.pathExists(moduleResultPath))) {
      return;
    }

    const serializedModuleResult = await fsExtra.readJson(moduleResultPath);

    return serializedModuleResult;
  }

  private async _saveModuleResult(
    moduleId: string,
    serializedModuleResult: SerializedModuleResult
  ): Promise<void> {
    if (this._isHardhatNetwork) {
      return;
    }

    if (this._chainId === undefined) {
      const { chainId } = await this._ethers.provider.getNetwork();
      this._chainId = chainId;
    }

    const deploymentsDirectory = path.join(
      this._paths.deployments,
      String(this._chainId)
    );
    fsExtra.ensureDirSync(deploymentsDirectory);

    const moduleResultPath = path.join(
      deploymentsDirectory,
      `${moduleId}.json`
    );

    await fsExtra.writeJson(moduleResultPath, serializedModuleResult, {
      spaces: 2,
    });
  }
}

type Resolved<T> = T extends string
  ? T
  : T extends Binding<any, infer O>
  ? O extends string
    ? string
    : ethers.Contract
  : {
      [K in keyof T]: T[K] extends Binding<any, infer O>
        ? O extends string
          ? string
          : ethers.Contract
        : T[K];
    };
