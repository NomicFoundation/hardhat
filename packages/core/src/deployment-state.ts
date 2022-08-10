import type {
  FutureOutput,
  ModuleResult,
  SerializedModuleResult,
} from "./futures/types";
import { serializeFutureOutput } from "./futures/utils";
import { ExecutionGraph } from "./modules/ExecutionGraph";
import { IgnitionModule } from "./modules/IgnitionModule";

export class DeploymentState {
  private _modules: Map<string, ModuleState> = new Map();

  public static fromExecutionGraph(
    executionGraph: ExecutionGraph
  ): DeploymentState {
    const deploymentState = new DeploymentState();
    for (const ignitionModule of executionGraph.getSortedModules()) {
      const moduleState = ModuleState.fromIgnitionModule(ignitionModule);
      deploymentState.addModule(moduleState);
    }

    return deploymentState;
  }

  public addModule(moduleState: ModuleState) {
    this._modules.set(moduleState.id, moduleState);
  }

  public addModuleResult(moduleId: string, moduleResult: ModuleResult) {
    const moduleState = this._modules.get(moduleId);

    if (moduleState === undefined) {
      throw new Error(
        `DeploymentState doesn't have module with id '${moduleId}'`
      );
    }

    for (const [futureId, futureOutput] of Object.entries(moduleResult)) {
      moduleState.setSuccess(futureId, futureOutput);
    }
  }

  public getModule(moduleId: string): ModuleState {
    const moduleState = this._modules.get(moduleId);
    if (moduleState === undefined) {
      throw new Error(
        `DeploymentState doesn't have module with id '${moduleId}'`
      );
    }

    return moduleState;
  }

  public getCurrentModule(): ModuleState | undefined {
    const runningModules = [...this._modules.values()].filter((m) =>
      m.isRunning()
    );

    if (runningModules.length === 0) {
      return;
    }

    if (runningModules.length > 1) {
      throw new Error(
        "assertion error: only one module should be running at the same time"
      );
    }

    return runningModules[0];
  }

  public getModules(): ModuleState[] {
    return [...this._modules.values()];
  }

  public getSuccessfulModules(): ModuleState[] {
    return [...this._modules.values()].filter((m) => m.isSuccess());
  }

  public isFutureSuccess(moduleId: string, futureId: string): boolean {
    const futureState = this._getFutureState(moduleId, futureId);

    return futureState._kind === "success";
  }

  public getFutureResult(moduleId: string, futureId: string) {
    const futureState = this._getFutureState(moduleId, futureId);

    if (futureState._kind !== "success") {
      throw new Error(
        `assertion error, unsuccessful future state: ${futureState._kind}`
      );
    }

    return futureState.result;
  }

  public isModuleSuccess(moduleId: string): boolean {
    const moduleState = this._getModuleState(moduleId);

    return moduleState.isSuccess();
  }

  public getHolds(): [string, string[]] | undefined {
    for (const [moduleId, moduleState] of this._modules.entries()) {
      const holds = moduleState.getHolds();
      if (holds.length > 0) {
        return [moduleId, holds];
      }
    }

    return;
  }

  public getFailures(): [string, Error[]] | undefined {
    for (const [moduleId, moduleState] of this._modules.entries()) {
      const failures = moduleState.getFailures();
      if (failures.length > 0) {
        return [moduleId, failures];
      }
    }

    return;
  }

  public setFutureState(
    moduleId: string,
    futureId: string,
    futureState: FutureState
  ) {
    const moduleState = this._getModuleState(moduleId);

    moduleState.setFutureState(futureId, futureState);
  }

  private _getFutureState(moduleId: string, futureId: string) {
    const moduleState = this._getModuleState(moduleId);

    return moduleState.getFutureState(futureId);
  }

  private _getModuleState(moduleId: string) {
    const moduleState = this._modules.get(moduleId);

    if (moduleState === undefined) {
      throw new Error(`No state for module '${moduleId}'`);
    }

    return moduleState;
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

export class ModuleState {
  private _started = false;
  private _futures = new Map<string, FutureState>();

  public static fromIgnitionModule(
    ignitionModule: IgnitionModule
  ): ModuleState {
    const moduleState = new ModuleState(ignitionModule.id);

    for (const executor of ignitionModule.getSortedExecutors()) {
      moduleState.addFuture(executor.future.id, FutureState.waiting());
    }

    return moduleState;
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
        `[ModuleResult] Module '${this.id}' has no result for future '${futureId}'`
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

  public toModuleResult(): SerializedModuleResult {
    const moduleResult: SerializedModuleResult = {};

    for (const [futureId, futureState] of this._futures.entries()) {
      if (futureState._kind !== "success") {
        throw new Error(
          "toModuleResult can only be called in successful modules"
        );
      }
      moduleResult[futureId] = serializeFutureOutput(futureState.result);
    }

    return moduleResult;
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
