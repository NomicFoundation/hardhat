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
  CallableFuture,
  Virtual,
} from "../types/future";
import { isArtifact, isCallable, isParameter } from "../types/guards";
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

  public getScopedLabel() {
    return this.scopes.join("/");
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
        scopeAdded: this.scopes.getScopedLabel(),
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
        scopeAdded: this.scopes.getScopedLabel(),
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
        scopeAdded: this.scopes.getScopedLabel(),
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
        scopeAdded: this.scopes.getScopedLabel(),
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
      scopeAdded: this.scopes.getScopedLabel(),
    });

    return deployedFuture;
  }

  public call(
    contractFuture: RecipeFuture,
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

    let contract: CallableFuture;
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
    } else if (isCallable(contractFuture)) {
      contract = contractFuture;
    } else {
      throw new Error(
        `Not a callable future ${contractFuture.label} (${contractFuture.type})`
      );
    }

    this.graph.addRecipeVertex({
      id: callFuture.vertexId,
      label: callFuture.label,
      type: "Call",
      contract,
      method: functionName,
      args: args ?? [],
      after: after ?? [],
      scopeAdded: this.scopes.getScopedLabel(),
    });

    return callFuture;
  }

  public getParam(paramName: string): RequiredParameter {
    const paramFuture: RequiredParameter = {
      label: paramName,
      type: "parameter",
      subtype: "required",
      scope: this.scopes.getScopedLabel(),
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
      scope: this.scopes.getScopedLabel(),
      _future: true,
    };

    return paramFuture;
  }

  public useRecipe(recipe: Recipe, options?: UseRecipeOptions): FutureDict {
    const useRecipeInvocationId = this.useRecipeInvocationCounter++;
    const label = `${recipe.name}:${useRecipeInvocationId}`;

    this.scopes.push(label);
    const scopeLabel = this.scopes.getScopedLabel();

    if (options !== undefined && options.parameters !== undefined) {
      this.graph.registeredParameters[scopeLabel] = options.parameters;
    }

    const result = recipe.steps(this);

    const virtualVertex = this._createRecipeVirtualVertex(label);

    this.scopes.pop();

    return { ...result, recipe: virtualVertex };
  }

  private _createRecipeVirtualVertex(label: string): Virtual {
    const virtualFuture: Virtual = {
      vertexId: this._resolveNextId(),
      label,
      type: "virtual",
      _future: true,
    };

    const scopeLabel = this.scopes.getScopedLabel();

    const afterVertexFutures = [...this.graph.vertexes.values()]
      .filter((v) => v.scopeAdded === scopeLabel)
      .map(
        (v): RecipeFuture => ({
          vertexId: v.id,
          label: v.label,
          type: "contract", // TODO: this is a hack, lets add a future type for this sort of ellision
          subtype: "artifact",
          _future: true,
        })
      );

    this.graph.addRecipeVertex({
      id: virtualFuture.vertexId,
      label,
      type: "Virtual",
      after: afterVertexFutures,
      scopeAdded: scopeLabel,
    });

    return virtualFuture;
  }

  private _resolveNextId(): number {
    return this.idCounter++;
  }
}
