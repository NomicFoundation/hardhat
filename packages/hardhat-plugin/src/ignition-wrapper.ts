import {
  Ignition,
  IgnitionDeployOptions,
  Providers,
  ExternalParamValue,
  Recipe,
} from "@nomicfoundation/ignition-core";
import { HardhatConfig, HardhatRuntimeEnvironment } from "hardhat/types";

import { renderToCli } from "./ui/renderToCli";

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
    private _deployOptions: Omit<
      IgnitionDeployOptions,
      keyof { ui?: boolean }
    > & { ui?: boolean }
  ) {
    this._ignition = new Ignition(_providers);
  }

  public async deploy(
    recipe: Recipe,
    deployParams:
      | { parameters: { [key: string]: ExternalParamValue }; ui?: boolean }
      | undefined
  ) {
    const showUi = deployParams?.ui ?? true;

    if (deployParams !== undefined) {
      await this._providers.config.setParams(deployParams.parameters);
    }

    const [deploymentResult] = await this._ignition.deploy(recipe, {
      ...this._deployOptions,
      ui: Boolean(deployParams?.ui) ? renderToCli : undefined,
    });

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

      if (showUi) {
        return process.exit(1);
      } else {
        throw new Error(
          `Execution failed for recipe '${recipeId}':\n\n${failuresMessage}`
        );
      }
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

        const contract: any = await this._ethers.getContractAt(abi, address);
        contract.abi = abi;
        resolvedOutput[key] = contract;
      }
    }

    return resolvedOutput;
  }

  public async plan(recipe: Recipe) {
    return this._ignition.plan(recipe);
  }
}
