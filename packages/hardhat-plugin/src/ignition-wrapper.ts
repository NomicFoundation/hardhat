import { ethers } from "ethers";
import fs from "fs";
import fsExtra from "fs-extra";
import { HardhatConfig, HardhatRuntimeEnvironment } from "hardhat/types";
import {
  Binding,
  BindingOutput,
  DeploymentPlan,
  DeploymentResult,
  deserializeBindingOutput,
  Ignition,
  ModuleResult,
  serializeBindingOutput,
  UserModule,
} from "ignition";
import path from "path";

type HardhatEthers = HardhatRuntimeEnvironment["ethers"];
type HardhatPaths = HardhatConfig["paths"];

export class IgnitionWrapper {
  private _ignition: Ignition;

  constructor(
    services: any,
    private _ethers: HardhatEthers,
    private _isHardhatNetwork: boolean,
    private _paths: HardhatPaths
  ) {
    this._ignition = new Ignition(services, !this._isHardhatNetwork);
  }

  public async deploy<T>(
    userModuleOrName: UserModule<T> | string
  ): Promise<Resolved<T>> {
    const [resolvedOutput] = await this.deployMany([userModuleOrName]);
    return resolvedOutput;
  }

  public async deployMany(
    userModulesOrNames: Array<UserModule<any> | string>
  ): Promise<Array<Resolved<any>>> {
    const pathToJournal = path.resolve(
      this._paths.root,
      "ignition-journal.json"
    );

    const { chainId } = await this._ethers.provider.getNetwork();

    const currentDeploymentResult = await this._getDeploymentResult(chainId);

    const userModules: Array<UserModule<any>> = [];
    for (const userModuleOrName of userModulesOrNames) {
      const userModule: UserModule<any> =
        typeof userModuleOrName === "string"
          ? await this._getModule(userModuleOrName)
          : userModuleOrName;

      userModules.push(userModule);
    }

    const [deploymentResult, moduleOutputs] = await this._ignition.deploy(
      userModules,
      this._isHardhatNetwork ? undefined : pathToJournal,
      currentDeploymentResult ?? new DeploymentResult()
    );

    const moduleHold = deploymentResult.isHold();
    if (moduleHold !== undefined) {
      const [moduleId, holdReason] = moduleHold;
      throw new Error(`Execution held for module '${moduleId}': ${holdReason}`);
    }

    await this._saveDeploymentResult(chainId, deploymentResult);

    const resolvedOutputs: any = [];
    for (const moduleOutput of moduleOutputs) {
      const resolvedOutput: any = {};
      for (const [key, value] of Object.entries<any>(moduleOutput as any)) {
        const bindingResult = deploymentResult.getBindingResult(
          value.moduleId,
          value.id
        )!;

        if (typeof bindingResult === "string") {
          resolvedOutput[key] = bindingResult;
        } else {
          const { abi, address } = bindingResult;
          resolvedOutput[key] = await this._ethers.getContractAt(abi, address);
        }
      }
      resolvedOutputs.push(resolvedOutput);
    }

    return resolvedOutputs;
  }

  public async buildPlan(
    userModulesOrNames: Array<UserModule<any> | string>
  ): Promise<DeploymentPlan> {
    const { chainId } = await this._ethers.provider.getNetwork();

    const currentDeploymentResult = await this._getDeploymentResult(chainId);

    const userModules: Array<UserModule<any>> = [];
    for (const userModuleOrName of userModulesOrNames) {
      const userModule: UserModule<any> =
        typeof userModuleOrName === "string"
          ? await this._getModule(userModuleOrName)
          : userModuleOrName;

      userModules.push(userModule);
    }

    const plan = await this._ignition.buildPlan(
      userModules,
      currentDeploymentResult ?? new DeploymentResult()
    );

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

  private async _saveDeploymentResult(
    chainId: number,
    deploymentResult: DeploymentResult
  ) {
    if (this._isHardhatNetwork) {
      return;
    }

    const deploymentsDirectory = path.join(
      this._paths.deployments,
      String(chainId)
    );
    fsExtra.ensureDirSync(deploymentsDirectory);

    const modulesResults = deploymentResult.getModules();

    for (const moduleResult of modulesResults) {
      const ignitionModulePath = path.join(
        deploymentsDirectory,
        `${moduleResult.moduleId}.json`
      );

      const serializedModule = JSON.stringify(
        moduleResult
          .getResults()
          .reduce((acc: any, [key, value]: [string, BindingOutput]) => {
            acc[key] = serializeBindingOutput(value);
            return acc;
          }, {}),
        undefined,
        2
      );
      fs.writeFileSync(ignitionModulePath, serializedModule);
    }
  }

  private async _getDeploymentResult(
    chainId: number
  ): Promise<DeploymentResult | undefined> {
    if (this._isHardhatNetwork) {
      return;
    }

    const deploymentsDirectory = path.join(
      this._paths.deployments,
      String(chainId)
    );

    if (!fsExtra.existsSync(deploymentsDirectory)) {
      return;
    }

    const moduleResultFiles = fs.readdirSync(deploymentsDirectory);

    const deploymentResult = new DeploymentResult();
    for (const moduleResultFile of moduleResultFiles) {
      const moduleId = path.parse(moduleResultFile).name;
      const serializedModuleResult = JSON.parse(
        fs
          .readFileSync(path.join(deploymentsDirectory, moduleResultFile))
          .toString()
      );
      const moduleResult = new ModuleResult(moduleId);

      for (const [bindingId, result] of Object.entries(
        serializedModuleResult
      )) {
        moduleResult.addResult(bindingId, deserializeBindingOutput(result));
      }

      deploymentResult.addResult(moduleId, moduleResult);
    }

    return deploymentResult;
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
