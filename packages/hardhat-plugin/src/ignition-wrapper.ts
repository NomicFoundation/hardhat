import { ethers } from "ethers";
import fs from "fs";
import fsExtra from "fs-extra";
import { HardhatConfig, HardhatRuntimeEnvironment } from "hardhat/types";
import {
  Binding,
  DeploymentPlan,
  DeploymentState,
  Ignition,
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
    private _paths: HardhatPaths,
    private _deployOptions: {
      pathToJournal: string | undefined;
      txPollingInterval: number;
    }
  ) {
    this._ignition = new Ignition(services, !this._isHardhatNetwork);
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
    const { chainId } = await this._ethers.provider.getNetwork();

    const currentDeploymentState = await this._getDeploymentState(chainId);

    const userModules: Array<UserModule<any>> = [];
    for (const userModuleOrName of userModulesOrNames) {
      const userModule: UserModule<any> =
        typeof userModuleOrName === "string"
          ? await this._getModule(userModuleOrName)
          : userModuleOrName;

      userModules.push(userModule);
    }

    const [deploymentState, moduleOutputs] = await this._ignition.deploy(
      userModules,
      currentDeploymentState,
      this._deployOptions
    );

    const moduleIdAndHoldReason = deploymentState.isHold();
    if (moduleIdAndHoldReason !== undefined) {
      const [moduleId, holdReason] = moduleIdAndHoldReason;
      throw new Error(`Execution held for module '${moduleId}': ${holdReason}`);
    }

    const moduleIdAndFailures = deploymentState.getFailures();
    if (moduleIdAndFailures !== undefined) {
      const [moduleId, failures] = moduleIdAndFailures;

      let failuresMessage = "";
      for (const failure of failures) {
        failuresMessage += `  - ${failure.message}\n`;
      }

      throw new Error(
        `Execution failed for module '${moduleId}':\n\n${failuresMessage}`
      );
    }

    await this._saveDeploymentState(chainId, deploymentState);

    const resolvedOutputs: any = [];
    for (const moduleOutput of moduleOutputs) {
      const resolvedOutput: any = {};
      for (const [key, value] of Object.entries<any>(moduleOutput as any)) {
        const bindingResult = deploymentState.getBindingResult(
          value.moduleId,
          value.id
        )!;

        if (
          typeof bindingResult === "string" ||
          typeof bindingResult === "number"
        ) {
          resolvedOutput[key] = bindingResult;
        } else if ("hash" in bindingResult) {
          resolvedOutput[key] = bindingResult.hash;
        } else {
          const { abi, address } = bindingResult;
          resolvedOutput[key] = await this._ethers.getContractAt(abi, address);
        }
      }
      resolvedOutputs.push(resolvedOutput);
    }

    return [deploymentState, resolvedOutputs];
  }

  public async buildPlan(
    userModulesOrNames: Array<UserModule<any> | string>
  ): Promise<DeploymentPlan> {
    const { chainId } = await this._ethers.provider.getNetwork();

    const currentDeploymentState = await this._getDeploymentState(chainId);

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
      currentDeploymentState
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

  private async _saveDeploymentState(
    chainId: number,
    deploymentState: DeploymentState
  ) {
    if (this._isHardhatNetwork) {
      return;
    }

    const deploymentsDirectory = path.join(
      this._paths.deployments,
      String(chainId)
    );
    fsExtra.ensureDirSync(deploymentsDirectory);

    const modulesStates = deploymentState.getModules();

    for (const moduleState of modulesStates) {
      const ignitionModulePath = path.join(
        deploymentsDirectory,
        `${moduleState.id}.json`
      );

      const serializedModule = JSON.stringify(
        moduleState
          .getBindingsStates()
          .reduce((acc: any, [bindingId, bindingState]) => {
            if (bindingState._kind !== "success") {
              throw new Error(
                "assertion error: only successful modules should be saved"
              );
            }
            acc[bindingId] = serializeBindingOutput(bindingState.result);
            return acc;
          }, {}),
        undefined,
        2
      );
      fs.writeFileSync(ignitionModulePath, serializedModule);
    }
  }

  private async _getDeploymentState(
    chainId: number
  ): Promise<DeploymentState | undefined> {
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

    return undefined;

    // TODO implement something like ModuleState.fromJSON() and
    // use it to build the deployment state here

    // const moduleResultFiles = fs.readdirSync(deploymentsDirectory);

    // const deploymentState = new DeploymentState();
    // for (const moduleResultFile of moduleResultFiles) {
    //   const moduleId = path.parse(moduleResultFile).name;
    //   const serializedModuleResult = JSON.parse(
    //     fs
    //       .readFileSync(path.join(deploymentsDirectory, moduleResultFile))
    //       .toString()
    //   );
    //   const moduleResult = new ModuleResult(moduleId);
    //
    //   for (const [bindingId, result] of Object.entries(
    //     serializedModuleResult
    //   )) {
    //     moduleResult.addResult(bindingId, deserializeBindingOutput(result));
    //   }
    //
    //   deploymentState.addResult(moduleResult);
    // }

    // return deploymentState;
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
