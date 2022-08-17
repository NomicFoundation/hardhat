import { CallExecutor } from "../executors/CallExecutor";
import { ContractExecutor } from "../executors/ContractExecutor";
import { Executor } from "../executors/Executor";
import { ExistingContractExecutor } from "../executors/ExistingContractExecutor";
import { ParamExecutor } from "../executors/ParamExecutor";
import { ArtifactContractFuture } from "../futures/ArtifactContractFuture";
import { ContractFuture } from "../futures/ContractFuture";
import { ExistingContractFuture } from "../futures/ExistingContractFuture";
import { InternalCallFuture } from "../futures/InternalCallFuture";
import { InternalContractFuture } from "../futures/InternalContractFuture";
import { InternalFuture } from "../futures/InternalFuture";
import { ParamFuture } from "../futures/ParamFuture";
import type {
  CallOptions,
  ContractOptions,
  ExistingContractOptions,
} from "../futures/types";
import type { Artifact, Contract, Tx } from "../types";

import { ExecutionGraph } from "./ExecutionGraph";
import { UserRecipe } from "./UserRecipe";
import type {
  RecipeBuilder,
  UserContractOptions,
  UserCallOptions,
  ParamValue,
} from "./types";
import { isArtifact } from "./utils";

export class RecipeBuilderImpl implements RecipeBuilder {
  private _currentRecipeId: string | undefined;
  private _executionGraph = new ExecutionGraph();
  private _executors: Executor[] = [];
  private _knownRecipes: Map<string, [UserRecipe<any>, any]> = new Map();

  constructor(public chainId: number) {}

  public getRecipeId(): string {
    if (this._currentRecipeId === undefined) {
      throw new Error("[RecipeBuilderImpl] Assertion error: no recipe is set");
    }

    return this._currentRecipeId;
  }

  public buildExecutionGraph(): ExecutionGraph {
    return this._executionGraph;
  }

  public addExecutor(executor: Executor) {
    if (this._currentRecipeId === undefined) {
      throw new Error("[RecipeBuilderImpl] Assertion error: no recipe is set");
    }

    this._executionGraph.addExecutor(executor);
  }

  public contract(
    contractName: string,
    artifactOrOptions?: Artifact | UserContractOptions,
    givenOptions?: UserContractOptions
  ): InternalFuture<ContractOptions, Contract> {
    let future;
    if (isArtifact(artifactOrOptions)) {
      const artifact = artifactOrOptions;
      const options = givenOptions;

      const id = options?.id ?? contractName;
      const args = options?.args ?? [];
      const libraries = options?.libraries ?? {};

      future = new ArtifactContractFuture(this.getRecipeId(), id, {
        contractName,
        args,
        libraries,
        artifact,
      });
    } else {
      const options = artifactOrOptions;

      const id = options?.id ?? contractName;
      const args = options?.args ?? [];
      const libraries = options?.libraries ?? {};

      future = new InternalContractFuture(this.getRecipeId(), id, {
        contractName,
        args,
        libraries,
      });
    }

    this.addExecutor(new ContractExecutor(future));

    return future;
  }

  public contractAt(
    contractName: string,
    address: string,
    abi: any[]
  ): InternalFuture<ExistingContractOptions, Contract> {
    const id = contractName;

    const future = new ExistingContractFuture(this.getRecipeId(), id, {
      contractName,
      address,
      abi,
    });

    this.addExecutor(new ExistingContractExecutor(future));

    return future;
  }

  public call(
    contract: ContractFuture,
    method: string,
    options?: UserCallOptions
  ): InternalFuture<CallOptions, Tx> {
    const id =
      options?.id ?? `${(contract as InternalContractFuture).id}.${method}`;
    const args = options?.args ?? [];
    const b = new InternalCallFuture(this.getRecipeId(), id, {
      contract,
      method,
      args,
    });

    this.addExecutor(new CallExecutor(b));

    return b;
  }

  public useRecipe<T>(userRecipe: UserRecipe<T>): T {
    const knownRecipeAndOutput = this._knownRecipes.get(userRecipe.id);
    if (knownRecipeAndOutput !== undefined) {
      const [knownRecipe, knownOutput] = knownRecipeAndOutput;
      if (userRecipe === knownRecipe) {
        return knownOutput;
      } else {
        throw new Error(`Recipe with id ${userRecipe.id} already exists`);
      }
    }

    const previousRecipeId = this._currentRecipeId;
    this._currentRecipeId = userRecipe.id;
    const output = userRecipe.definition(this);
    this._currentRecipeId = previousRecipeId;

    this._knownRecipes.set(userRecipe.id, [userRecipe, output]);

    return output;
  }

  public getParam(paramName: string): ParamFuture {
    const id = paramName;

    const future = new ParamFuture(this.getRecipeId(), id, { paramName });

    this.addExecutor(new ParamExecutor(future));

    return future;
  }

  public getOptionalParam(
    paramName: string,
    defaultValue: ParamValue
  ): ParamFuture {
    const id = paramName;

    const future = new ParamFuture(this.getRecipeId(), id, {
      paramName,
      defaultValue,
    });

    this.addExecutor(new ParamExecutor(future));

    return future;
  }
}
