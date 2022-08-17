import {
  Future,
  DeploymentPlan,
  Ignition,
  UserRecipe,
  IgnitionDeployOptions,
  SerializedRecipeResult,
  Providers,
  ParamValue,
} from "@nomicfoundation/ignition-core";
import { ethers } from "ethers";
import fsExtra from "fs-extra";
import { HardhatConfig, HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

import { getAllUserRecipesPaths } from "./user-recipes";

type HardhatEthers = HardhatRuntimeEnvironment["ethers"];
type HardhatPaths = HardhatConfig["paths"];

export class IgnitionWrapper {
  private _ignition: Ignition;
  private _cachedChainId: number | undefined;

  constructor(
    private _providers: Providers,
    private _ethers: HardhatEthers,
    private _isHardhatNetwork: boolean,
    private _paths: HardhatPaths,
    private _deployOptions: IgnitionDeployOptions
  ) {
    this._ignition = new Ignition(_providers, {
      load: (recipeId) => this._getRecipeResult(recipeId),
      save: (recipeId, recipeResult) =>
        this._saveRecipeResult(recipeId, recipeResult),
    });
  }

  public async deploySingleGraph(recipe: any, _options: any) {
    const [deploymentResult] = await this._ignition.deploySingleGraph(recipe);

    if (deploymentResult._kind === "hold") {
      const [recipeId, holdReason] = deploymentResult.holds;
      throw new Error(`Execution held for recipe '${recipeId}': ${holdReason}`);
    }

    if (deploymentResult._kind === "failure") {
      const [recipeId, failures] = deploymentResult.failures;

      let failuresMessage = "";
      for (const failure of failures) {
        failuresMessage += `  - ${failure.message}\n`;
      }

      throw new Error(
        `Execution failed for recipe '${recipeId}':\n\n${failuresMessage}`
      );
    }

    const resolvedOutput: any = {};
    for (const [key, serializedFutureResult] of Object.entries<any>(
      deploymentResult.result
    )) {
      if (
        serializedFutureResult._kind === "string" ||
        serializedFutureResult._kind === "number"
      ) {
        resolvedOutput[key] = serializedFutureResult;
      } else if (serializedFutureResult._kind === "tx") {
        resolvedOutput[key] = serializedFutureResult.value.hash;
      } else {
        const { abi, address } = serializedFutureResult.value;
        resolvedOutput[key] = await this._ethers.getContractAt(abi, address);
      }
    }

    return resolvedOutput;
  }

  public async deploy<T>(
    userRecipeOrName: UserRecipe<T> | string,
    deployParams?: { parameters: { [key: string]: ParamValue } }
  ): Promise<Resolved<T>> {
    const [, resolvedOutputs] = await this.deployMany(
      [userRecipeOrName],
      deployParams
    );

    return resolvedOutputs[0];
  }

  /**
   * Deploys all the given recipes. Returns the deployment result, and an
   * array with the resolved outputs that corresponds to each recipe in
   * the input.
   */
  public async deployMany(
    userRecipesOrNames: Array<UserRecipe<any> | string>,
    deployParams: { parameters: { [key: string]: ParamValue } } | undefined
  ) {
    if (deployParams !== undefined) {
      await this._providers.config.setParams(deployParams.parameters);
    }

    const userRecipes: Array<UserRecipe<any>> = [];

    for (const userRecipeOrName of userRecipesOrNames) {
      const userRecipe: UserRecipe<any> =
        typeof userRecipeOrName === "string"
          ? await this._getRecipe(userRecipeOrName)
          : userRecipeOrName;

      userRecipes.push(userRecipe);
    }

    const [deploymentResult, recipeOutputs] = await this._ignition.deploy(
      userRecipes,
      this._deployOptions
    );

    if (deploymentResult._kind === "hold") {
      const [recipeId, holdReason] = deploymentResult.holds;
      throw new Error(`Execution held for recipe '${recipeId}': ${holdReason}`);
    }

    if (deploymentResult._kind === "failure") {
      const [recipeId, failures] = deploymentResult.failures;

      let failuresMessage = "";
      for (const failure of failures) {
        failuresMessage += `  - ${failure.message}\n`;
      }

      throw new Error(
        `Execution failed for recipe '${recipeId}':\n\n${failuresMessage}`
      );
    }

    const resolvedOutputPerRecipe: Record<string, any> = {};
    for (const [recipeId, recipeOutput] of Object.entries(recipeOutputs)) {
      const resolvedOutput: any = {};
      for (const [key, value] of Object.entries<any>(recipeOutput)) {
        const serializedFutureResult =
          deploymentResult.result[value.recipeId][value.id];

        if (
          serializedFutureResult._kind === "string" ||
          serializedFutureResult._kind === "number"
        ) {
          resolvedOutput[key] = serializedFutureResult;
        } else if (serializedFutureResult._kind === "tx") {
          resolvedOutput[key] = serializedFutureResult.value.hash;
        } else {
          const { abi, address } = serializedFutureResult.value;
          resolvedOutput[key] = await this._ethers.getContractAt(abi, address);
        }
      }
      resolvedOutputPerRecipe[recipeId] = resolvedOutput;
    }

    const resolvedOutputs = userRecipes.map(
      (x) => resolvedOutputPerRecipe[x.id]
    );

    return [deploymentResult, resolvedOutputs] as const;
  }

  public async buildPlan(
    userRecipesOrNames: Array<UserRecipe<any> | string>
  ): Promise<DeploymentPlan> {
    const userRecipes: Array<UserRecipe<any>> = [];
    for (const userRecipeOrName of userRecipesOrNames) {
      const userRecipe: UserRecipe<any> =
        typeof userRecipeOrName === "string"
          ? await this._getRecipe(userRecipeOrName)
          : userRecipeOrName;

      userRecipes.push(userRecipe);
    }

    const plan = await this._ignition.buildPlan(userRecipes);

    return plan;
  }

  private async _getRecipe<T>(recipeId: string): Promise<UserRecipe<T>> {
    const userRecipesPaths = getAllUserRecipesPaths(this._paths.ignition);

    for (const userRecipePath of userRecipesPaths) {
      const resolveUserRecipePath = path.resolve(
        this._paths.ignition,
        userRecipePath
      );

      const fileExists = await fsExtra.pathExists(resolveUserRecipePath);
      if (!fileExists) {
        throw new Error(`Recipe ${resolveUserRecipePath} doesn't exist`);
      }

      const userRecipe = require(resolveUserRecipePath);
      const userRecipeContent = userRecipe.default ?? userRecipe;

      if (userRecipeContent.id === recipeId) {
        return userRecipeContent;
      }
    }

    throw new Error(`No recipe found with id ${recipeId}`);
  }

  private async _getRecipeResult(
    recipeId: string
  ): Promise<SerializedRecipeResult | undefined> {
    if (this._isHardhatNetwork) {
      return;
    }

    const chainId = await this._getChainId();

    const recipeResultPath = path.join(
      this._paths.deployments,
      String(chainId),
      `${recipeId}.json`
    );

    if (!(await fsExtra.pathExists(recipeResultPath))) {
      return;
    }

    const serializedRecipeResult = await fsExtra.readJson(recipeResultPath);

    return serializedRecipeResult;
  }

  private async _saveRecipeResult(
    recipeId: string,
    serializedRecipeResult: SerializedRecipeResult
  ): Promise<void> {
    if (this._isHardhatNetwork) {
      return;
    }

    const chainId = await this._getChainId();

    const deploymentsDirectory = path.join(
      this._paths.deployments,
      String(chainId)
    );

    fsExtra.ensureDirSync(deploymentsDirectory);

    const recipeResultPath = path.join(
      deploymentsDirectory,
      `${recipeId}.json`
    );

    await fsExtra.writeJson(recipeResultPath, serializedRecipeResult, {
      spaces: 2,
    });
  }

  private async _getChainId(): Promise<number> {
    if (this._cachedChainId === undefined) {
      const { chainId } = await this._ethers.provider.getNetwork();
      this._cachedChainId = chainId;
    }

    return this._cachedChainId;
  }
}

type Resolved<T> = T extends string
  ? T
  : T extends Future<any, infer O>
  ? O extends string
    ? string
    : ethers.Contract
  : {
      [K in keyof T]: T[K] extends Future<any, infer O>
        ? O extends string
          ? string
          : ethers.Contract
        : T[K];
    };
