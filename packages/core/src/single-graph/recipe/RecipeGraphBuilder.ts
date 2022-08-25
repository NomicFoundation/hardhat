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
import { isArtifact, isParameter } from "../types/guards";
import type { Artifact } from "../types/hardhat";
import {
  ContractOptions,
  IRecipeGraph,
  IRecipeGraphBuilder,
  Recipe,
  RecipeGraphBuilderOptions,
  UseRecipeOptions,
} from "../types/recipeGraph";

import { RecipeGraph } from "./RecipeGraph";

class ScopeStack {
  private scopes: string[];

  constructor() {
    this.scopes = [];
  }

  public push(scopeName: string): void {
    this.scopes.push(scopeName);
  }

  public pop(): string | undefined {
    return this.scopes.pop();
  }

  public getScopedLabel(label: string | undefined) {
    const joinedScopes = this.scopes.join("/");

    return label === undefined ? joinedScopes : `${joinedScopes}/${label}`;
  }
}

export class RecipeGraphBuilder implements IRecipeGraphBuilder {
  public chainId: number;
  public graph: IRecipeGraph;
  private idCounter: number;
  private useRecipeInvocationCounter: number;
  private scopes: ScopeStack;

  constructor(options: RecipeGraphBuilderOptions) {
    this.chainId = options.chainId;
    this.idCounter = 0;
    this.useRecipeInvocationCounter = 0;
    this.graph = new RecipeGraph();

    this.scopes = new ScopeStack();
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
        vertexId: this._resolveNextId(),
        label: libraryName,
        type: "library",
        subtype: "artifact",
        _future: true,
      };

      this.graph.addRecipeVertex({
        id: artifactContractFuture.vertexId,
        label: libraryName,
        type: "ArtifactLibrary",
        artifact,
        args: options?.args ?? [],
      });

      return artifactContractFuture;
    } else {
      const options: ContractOptions | undefined = artifactOrOptions;

      const libraryFuture: HardhatLibrary = {
        vertexId: this._resolveNextId(),
        label: libraryName,
        type: "library",
        subtype: "hardhat",
        _future: true,
      };

      this.graph.addRecipeVertex({
        id: libraryFuture.vertexId,
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
        vertexId: this._resolveNextId(),
        label: contractName,
        type: "contract",
        subtype: "artifact",
        _future: true,
      };

      this.graph.addRecipeVertex({
        id: artifactContractFuture.vertexId,
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
        vertexId: this._resolveNextId(),
        label: contractName,
        type: "contract",
        subtype: "hardhat",
        _future: true,
      };

      this.graph.addRecipeVertex({
        id: contractFuture.vertexId,
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
      vertexId: this._resolveNextId(),
      label: contractName,
      type: "contract",
      subtype: "deployed",
      _future: true,
    };

    this.graph.addRecipeVertex({
      id: deployedFuture.vertexId,
      label: contractName,
      type: "DeployedContract",
      address,
      abi,
    });

    return deployedFuture;
  }

  public call(
    contractFuture:
      | HardhatContract
      | ArtifactContract
      | DeployedContract
      | RequiredParameter
      | OptionalParameter,
    functionName: string,
    {
      args,
      after,
    }: {
      args: Array<string | number | RecipeFuture>;
      after?: RecipeFuture[];
    }
  ): ContractCall {
    const callFuture: ContractCall = {
      vertexId: this._resolveNextId(),
      label: `${contractFuture.label}/${functionName}`,
      type: "call",
      _future: true,
    };

    let contract: RecipeFuture;
    if (isParameter(contractFuture)) {
      const parameter = contractFuture;
      const scope = parameter.scope;

      const registeredScope = this.graph.registeredParameters[scope];

      if (
        registeredScope === undefined ||
        !(parameter.label in registeredScope)
      ) {
        throw new Error("Could not resolve contract from parameter");
      }

      contract = registeredScope[parameter.label] as
        | HardhatContract
        | ArtifactContract
        | DeployedContract;
    } else {
      contract = contractFuture;
    }

    this.graph.addRecipeVertex({
      id: callFuture.vertexId,
      label: callFuture.label,
      type: "Call",
      contract,
      method: functionName,
      args: args ?? [],
      after: after ?? [],
    });

    return callFuture;
  }

  public getParam(paramName: string): RequiredParameter {
    const paramFuture: RequiredParameter = {
      label: paramName,
      type: "parameter",
      subtype: "required",
      scope: this.scopes.getScopedLabel(undefined),
      _future: true,
    };

    return paramFuture;
  }

  public getOptionalParam(
    paramName: string,
    defaultValue: ParameterValue
  ): OptionalParameter {
    const paramFuture: OptionalParameter = {
      label: paramName,
      type: "parameter",
      subtype: "optional",
      defaultValue,
      scope: this.scopes.getScopedLabel(undefined),
      _future: true,
    };

    return paramFuture;
  }

  public useRecipe(recipe: Recipe, options?: UseRecipeOptions): FutureDict {
    const useRecipeInvocationId = this.useRecipeInvocationCounter++;

    this.scopes.push(`${recipe.name}:${useRecipeInvocationId}`);

    if (options !== undefined && options.parameters !== undefined) {
      const parametersLabel = this.scopes.getScopedLabel(undefined);

      this.graph.registeredParameters[parametersLabel] = options.parameters;
    }

    const result = recipe.steps(this);

    this.scopes.pop();

    return result;
  }

  private _resolveNextId(): number {
    return this.idCounter++;
  }
}
