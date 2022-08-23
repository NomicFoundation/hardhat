import type {
  RecipeFuture,
  HardhatContract,
  ArtifactLibrary,
  HardhatLibrary,
  ArtifactContract,
  DeployedContract,
  ContractCall,
  RequiredParameter,
  OptionalParameter,
  ParameterValue,
  FutureDict,
} from "../types/future";
import { isArtifact } from "../types/guards";
import type { Artifact } from "../types/hardhat";
import {
  ContractOptions,
  IRecipeGraph,
  IRecipeGraphBuilder,
  Recipe,
  RecipeGraphBuilderOptions,
} from "../types/recipeGraph";

import { RecipeGraph } from "./RecipeGraph";

export class RecipeGraphBuilder implements IRecipeGraphBuilder {
  public chainId: number;
  public graph: IRecipeGraph;
  private idCounter: number;

  constructor(options: RecipeGraphBuilderOptions) {
    this.chainId = options.chainId;
    this.idCounter = 0;
    this.graph = new RecipeGraph();
  }

  public library(
    libraryName: string,
    artifactOrOptions?: ContractOptions | Artifact | undefined,
    givenOptions?: ContractOptions | undefined
  ): HardhatLibrary | ArtifactLibrary {
    if (isArtifact(artifactOrOptions)) {
      const artifact = artifactOrOptions;
      const options: ContractOptions | undefined = givenOptions;

      const artifactContractFuture: ArtifactLibrary = {
        id: this._resolveNextId(),
        label: libraryName,
        type: "library",
        subtype: "artifact",
        _future: true,
      };

      this.graph.addRecipeVertex({
        id: artifactContractFuture.id,
        label: libraryName,
        type: "ArtifactLibrary",
        artifact,
        args: options?.args ?? [],
      });

      return artifactContractFuture;
    } else {
      const options: ContractOptions | undefined = artifactOrOptions;

      const libraryFuture: HardhatLibrary = {
        id: this._resolveNextId(),
        label: libraryName,
        type: "library",
        subtype: "hardhat",
        _future: true,
      };

      this.graph.addRecipeVertex({
        id: libraryFuture.id,
        label: libraryName,
        type: "HardhatLibrary",
        libraryName,
        args: options?.args ?? [],
      });

      return libraryFuture;
    }
  }

  public contract(
    contractName: string,
    artifactOrOptions?: Artifact | ContractOptions,
    givenOptions?: ContractOptions
  ): HardhatContract | ArtifactContract {
    if (isArtifact(artifactOrOptions)) {
      const artifact = artifactOrOptions;
      const options: ContractOptions | undefined = givenOptions;

      const artifactContractFuture: ArtifactContract = {
        id: this._resolveNextId(),
        label: contractName,
        type: "contract",
        subtype: "artifact",
        _future: true,
      };

      this.graph.addRecipeVertex({
        id: artifactContractFuture.id,
        label: contractName,
        type: "ArtifactContract",
        artifact,
        args: options?.args ?? [],
        libraries: options?.libraries ?? {},
      });

      return artifactContractFuture;
    } else {
      const options: ContractOptions | undefined = artifactOrOptions;

      const contractFuture: HardhatContract = {
        id: this._resolveNextId(),
        label: contractName,
        type: "contract",
        subtype: "hardhat",
        _future: true,
      };

      this.graph.addRecipeVertex({
        id: contractFuture.id,
        label: contractName,
        type: "HardhatContract",
        contractName,
        args: options?.args ?? [],
        libraries: options?.libraries ?? {},
      });

      return contractFuture;
    }
  }

  public contractAt(
    contractName: string,
    address: string,
    abi: any[]
  ): DeployedContract {
    const deployedFuture: DeployedContract = {
      id: this._resolveNextId(),
      label: contractName,
      type: "contract",
      subtype: "deployed",
      _future: true,
    };

    this.graph.addRecipeVertex({
      id: deployedFuture.id,
      label: contractName,
      type: "DeployedContract",
      address,
      abi,
    });

    return deployedFuture;
  }

  public call(
    contractFuture: HardhatContract | ArtifactContract | DeployedContract,
    functionName: string,
    {
      args,
    }: {
      args: Array<string | number | RecipeFuture>;
    }
  ): ContractCall {
    const callFuture: ContractCall = {
      id: this._resolveNextId(),
      label: `${contractFuture.label}/${functionName}`,
      type: "call",
      _future: true,
    };

    this.graph.addRecipeVertex({
      id: callFuture.id,
      label: callFuture.label,
      type: "Call",
      contract: contractFuture,
      method: functionName,
      args: args ?? [],
    });

    return callFuture;
  }

  public getParam(paramName: string): RequiredParameter {
    const paramFuture: RequiredParameter = {
      id: this._resolveNextId(),
      label: paramName,
      type: "parameter",
      subtype: "required",
      _future: true,
    };

    return paramFuture;
  }

  public getOptionalParam(
    paramName: string,
    defaultValue: ParameterValue
  ): OptionalParameter {
    const paramFuture: OptionalParameter = {
      id: this._resolveNextId(),
      label: paramName,
      type: "parameter",
      subtype: "optional",
      defaultValue,
      _future: true,
    };

    return paramFuture;
  }

  public useRecipe(recipe: Recipe): FutureDict {
    const result = recipe.steps(this);

    return result;
  }

  private _resolveNextId(): number {
    return this.idCounter++;
  }
}
