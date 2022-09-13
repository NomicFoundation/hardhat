import {
  Ignition,
  IgnitionDeployOptions,
  SerializedRecipeResult,
  Providers,
  ExternalParamValue,
  Recipe,
} from "@nomicfoundation/ignition-core";
import fsExtra from "fs-extra";
import { HardhatConfig, HardhatRuntimeEnvironment } from "hardhat/types";
import path from "path";

type HardhatEthers = HardhatRuntimeEnvironment["ethers"];
type HardhatPaths = HardhatConfig["paths"];

const htmlTemplate = `
<html>
  <body>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>
      mermaid.initialize({ startOnLoad: true });
    </script>

    <div class="mermaid">
      $
    </div>
  </body>
</html>
`;

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

  public async deploy(
    recipe: Recipe,
    deployParams:
      | { parameters: { [key: string]: ExternalParamValue }; ui?: boolean }
      | undefined
  ) {
    if (deployParams !== undefined) {
      await this._providers.config.setParams(deployParams.parameters);
    }

    const [deploymentResult] = await this._ignition.deploy(recipe, {
      ...this._deployOptions,
      ui: deployParams?.ui ?? true,
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

        const contract: any = await this._ethers.getContractAt(abi, address);
        contract.abi = abi;
        resolvedOutput[key] = contract;
      }
    }

    return resolvedOutput;
  }

  public async plan(recipe: any) {
    const plan = await this._ignition.plan(recipe);

    if (!Array.isArray(plan)) {
      // const recipeGraph = plan.recipeGraph.toMermaid();
      // const executionGraph = plan.executionGraph.toMermaid();

      // placeholder
      const recipeGraph = "";
      const executionGraph = "";

      const output = `
flowchart
subgraph ExecutionGraph
direction TB
${executionGraph.substring(executionGraph.indexOf("\n"))}
end
subgraph RecipeGraph
direction TB
${recipeGraph.substring(recipeGraph.indexOf("\n"))}
end
`;
      return htmlTemplate.replace("$", output);
    }

    return htmlTemplate.replace("$", "");
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
