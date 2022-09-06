import type {
  FutureOutput,
  RecipeResult,
  SerializedRecipeResult,
} from "./futures/types";
import { serializeFutureOutput } from "./futures/utils";
import { ExecutionGraph } from "./recipes/ExecutionGraph";
import { IgnitionRecipe } from "./recipes/IgnitionRecipe";

export class DeploymentState {
  private _recipes: Map<string, RecipeState> = new Map();

  public static fromExecutionGraph(
    executionGraph: ExecutionGraph
  ): DeploymentState {
    const deploymentState = new DeploymentState();
    for (const ignitionRecipe of executionGraph.getSortedRecipes()) {
      const recipeState = RecipeState.fromIgnitionRecipe(ignitionRecipe);
      deploymentState.addRecipe(recipeState);
    }

    return deploymentState;
  }

  public addRecipe(recipeState: RecipeState) {
    this._recipes.set(recipeState.id, recipeState);
  }

  public addRecipeResult(recipeId: string, recipeResult: RecipeResult) {
    const recipeState = this._recipes.get(recipeId);

    if (recipeState === undefined) {
      throw new Error(
        `DeploymentState doesn't have recipe with id '${recipeId}'`
      );
    }

    for (const [futureId, futureOutput] of Object.entries(recipeResult)) {
      recipeState.setSuccess(futureId, futureOutput);
    }
  }

  public getRecipe(recipeId: string): RecipeState {
    const recipeState = this._recipes.get(recipeId);
    if (recipeState === undefined) {
      throw new Error(
        `DeploymentState doesn't have recipe with id '${recipeId}'`
      );
    }

    return recipeState;
  }

  public getCurrentRecipe(): RecipeState | undefined {
    const runningRecipes = [...this._recipes.values()].filter((m) =>
      m.isRunning()
    );

    if (runningRecipes.length === 0) {
      return;
    }

    if (runningRecipes.length > 1) {
      throw new Error(
        "assertion error: only one recipe should be running at the same time"
      );
    }

    return runningRecipes[0];
  }

  public getRecipes(): RecipeState[] {
    return [...this._recipes.values()];
  }

  public getSuccessfulRecipes(): RecipeState[] {
    return [...this._recipes.values()].filter((m) => m.isSuccess());
  }

  public isFutureSuccess(recipeId: string, futureId: string): boolean {
    const futureState = this._getFutureState(recipeId, futureId);

    return futureState._kind === "success";
  }

  public getFutureResult(recipeId: string, futureId: string) {
    const futureState = this._getFutureState(recipeId, futureId);

    if (futureState._kind !== "success") {
      throw new Error(
        `assertion error, unsuccessful future state: ${futureState._kind}`
      );
    }

    return futureState.result;
  }

  public isRecipeSuccess(recipeId: string): boolean {
    const recipeState = this._getRecipeState(recipeId);

    return recipeState.isSuccess();
  }

  public getHolds(): [string, string[]] | undefined {
    for (const [recipeId, recipeState] of this._recipes.entries()) {
      const holds = recipeState.getHolds();
      if (holds.length > 0) {
        return [recipeId, holds];
      }
    }

    return;
  }

  public getFailures(): [string, Error[]] | undefined {
    for (const [recipeId, recipeState] of this._recipes.entries()) {
      const failures = recipeState.getFailures();
      if (failures.length > 0) {
        return [recipeId, failures];
      }
    }

    return;
  }

  public setFutureState(
    recipeId: string,
    futureId: string,
    futureState: FutureState
  ) {
    const recipeState = this._getRecipeState(recipeId);

    recipeState.setFutureState(futureId, futureState);
  }

  private _getFutureState(recipeId: string, futureId: string) {
    const recipeState = this._getRecipeState(recipeId);

    return recipeState.getFutureState(futureId);
  }

  private _getRecipeState(recipeId: string) {
    const recipeState = this._recipes.get(recipeId);

    if (recipeState === undefined) {
      throw new Error(`No state for recipe '${recipeId}'`);
    }

    return recipeState;
  }
}

interface FutureStateWaiting {
  _kind: "waiting";
}
interface FutureStateReady {
  _kind: "ready";
}
interface FutureStateRunning {
  _kind: "running";
}
interface FutureStateSuccess {
  _kind: "success";
  result: FutureOutput;
}
interface FutureStateFailure {
  _kind: "failure";
  error: Error;
}
interface FutureStateHold {
  _kind: "hold";
  reason: string;
}
export type FutureState =
  | FutureStateWaiting
  | FutureStateReady
  | FutureStateRunning
  | FutureStateSuccess
  | FutureStateFailure
  | FutureStateHold;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentionally naming the variable the same as the type
export const FutureState = {
  waiting(): FutureState {
    return { _kind: "waiting" };
  },
  running(): FutureState {
    return { _kind: "running" };
  },
  success(result: FutureOutput): FutureState {
    return { _kind: "success", result };
  },
  failure(error: Error): FutureState {
    return { _kind: "failure", error };
  },
  hold(reason: string): FutureState {
    return { _kind: "hold", reason };
  },
};

export class RecipeState {
  private _started = false;
  private _futures = new Map<string, FutureState>();

  public static fromIgnitionRecipe(
    ignitionRecipe: IgnitionRecipe
  ): RecipeState {
    const recipeState = new RecipeState(ignitionRecipe.id);

    for (const executor of ignitionRecipe.getSortedExecutors()) {
      recipeState.addFuture(executor.future.id, FutureState.waiting());
    }

    return recipeState;
  }

  constructor(public readonly id: string) {}

  public addFuture(futureId: string, futureState: FutureState) {
    this._futures.set(futureId, futureState);
  }

  public getFuturesStates(): Array<[string, FutureState]> {
    return [...this._futures.entries()];
  }

  public isSuccess(): boolean {
    const successCount = [...this._futures.values()].filter(
      (b) => b._kind === "success"
    ).length;

    return successCount === this._futures.size;
  }

  public isRunning(): boolean {
    return (
      !this.isFailure() && !this.isHold() && !this.isSuccess() && this._started
    );
  }

  public isFailure(): boolean {
    return [...this._futures.values()].some((b) => b._kind === "failure");
  }

  public isHold(): boolean {
    return (
      !this.isFailure() &&
      [...this._futures.values()].some((b) => b._kind === "hold")
    );
  }

  public setFutureState(futureId: string, futureState: FutureState) {
    this._started = true;
    this._futures.set(futureId, futureState);
  }

  public setSuccess(futureId: string, result: any) {
    this._futures.set(futureId, FutureState.success(result));
  }

  public getFutureState(futureId: string): FutureState {
    const futureState = this._futures.get(futureId);
    if (futureState === undefined) {
      throw new Error(
        `[RecipeResult] Recipe '${this.id}' has no result for future '${futureId}'`
      );
    }

    return futureState;
  }

  public getFailures(): Error[] {
    return [...this._futures.values()]
      .filter((x): x is FutureStateFailure => x._kind === "failure")
      .map((x) => x.error);
  }

  public getHolds(): string[] {
    return [...this._futures.values()]
      .filter((x): x is FutureStateHold => x._kind === "hold")
      .map((x) => x.reason);
  }

  public count(): number {
    return this._futures.size;
  }

  public toRecipeResult(): SerializedRecipeResult {
    const recipeResult: SerializedRecipeResult = {};

    for (const [futureId, futureState] of this._futures.entries()) {
      if (futureState._kind !== "success") {
        throw new Error(
          "toRecipeResult can only be called in successful recipes"
        );
      }
      recipeResult[futureId] = serializeFutureOutput(futureState.result);
    }

    return recipeResult;
  }

  private _getFuture(futureId: string) {
    const futureState = this._futures.get(futureId);

    if (futureState === undefined) {
      throw new Error("assertion error");
    }

    return futureState;
  }

  private _isFutureSuccess(futureId: string): boolean {
    const futureState = this._getFuture(futureId);

    return futureState._kind === "success";
  }

  private _isFutureFailure(futureId: string): boolean {
    const futureState = this._getFuture(futureId);

    return futureState._kind === "failure";
  }

  private _isFutureHold(futureId: string): boolean {
    const futureState = this._getFuture(futureId);

    return futureState._kind === "hold";
  }
}
