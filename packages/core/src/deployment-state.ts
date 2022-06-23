import {
  BindingOutput,
  ModuleResult,
  serializeBindingOutput,
  SerializedModuleResult,
} from "./bindings/types";
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

    for (const [bindingId, bindingOutput] of Object.entries(moduleResult)) {
      moduleState.setSuccess(bindingId, bindingOutput);
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

  public isBindingSuccess(moduleId: string, bindingId: string): boolean {
    const bindingState = this._getBindingState(moduleId, bindingId);

    return bindingState._kind === "success";
  }

  public getBindingResult(moduleId: string, bindingId: string) {
    const bindingState = this._getBindingState(moduleId, bindingId);

    if (bindingState._kind !== "success") {
      throw new Error("assertion error");
    }

    return bindingState.result;
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

  public setBindingState(
    moduleId: string,
    bindingId: string,
    bindingState: BindingState
  ) {
    const moduleState = this._getModuleState(moduleId);

    moduleState.setBindingState(bindingId, bindingState);
  }

  private _getBindingState(moduleId: string, bindingId: string) {
    const moduleState = this._getModuleState(moduleId);

    return moduleState.getBindingState(bindingId);
  }

  private _getModuleState(moduleId: string) {
    const moduleState = this._modules.get(moduleId);

    if (moduleState === undefined) {
      throw new Error(`No state for module '${moduleId}'`);
    }

    return moduleState;
  }
}

interface BindingStateWaiting {
  _kind: "waiting";
}
interface BindingStateReady {
  _kind: "ready";
}
interface BindingStateRunning {
  _kind: "running";
}
interface BindingStateSuccess {
  _kind: "success";
  result: BindingOutput;
}
interface BindingStateFailure {
  _kind: "failure";
  error: Error;
}
interface BindingStateHold {
  _kind: "hold";
  reason: string;
}
export type BindingState =
  | BindingStateWaiting
  | BindingStateReady
  | BindingStateRunning
  | BindingStateSuccess
  | BindingStateFailure
  | BindingStateHold;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentionally naming the variable the same as the type
export const BindingState = {
  waiting(): BindingState {
    return { _kind: "waiting" };
  },
  running(): BindingState {
    return { _kind: "running" };
  },
  success(result: BindingOutput): BindingState {
    return { _kind: "success", result };
  },
  failure(error: Error): BindingState {
    return { _kind: "failure", error };
  },
  hold(reason: string): BindingState {
    return { _kind: "hold", reason };
  },
};

export class ModuleState {
  private _started = false;
  private _bindings = new Map<string, BindingState>();

  public static fromIgnitionModule(
    ignitionModule: IgnitionModule
  ): ModuleState {
    const moduleState = new ModuleState(ignitionModule.id);

    for (const executor of ignitionModule.getSortedExecutors()) {
      moduleState.addBinding(executor.binding.id, BindingState.waiting());
    }

    return moduleState;
  }

  constructor(public readonly id: string) {}

  public addBinding(bindingId: string, bindingState: BindingState) {
    this._bindings.set(bindingId, bindingState);
  }

  public getBindingsStates(): Array<[string, BindingState]> {
    return [...this._bindings.entries()];
  }

  public isSuccess(): boolean {
    const successCount = [...this._bindings.values()].filter(
      (b) => b._kind === "success"
    ).length;

    return successCount === this._bindings.size;
  }

  public isRunning(): boolean {
    return (
      !this.isFailure() && !this.isHold() && !this.isSuccess() && this._started
    );
  }

  public isFailure(): boolean {
    return [...this._bindings.values()].some((b) => b._kind === "failure");
  }

  public isHold(): boolean {
    return (
      !this.isFailure() &&
      [...this._bindings.values()].some((b) => b._kind === "hold")
    );
  }

  public setBindingState(bindingId: string, bindingState: BindingState) {
    this._started = true;
    this._bindings.set(bindingId, bindingState);
  }

  public setSuccess(bindingId: string, result: any) {
    this._bindings.set(bindingId, BindingState.success(result));
  }

  public getBindingState(bindingId: string): BindingState {
    const bindingState = this._bindings.get(bindingId);
    if (bindingState === undefined) {
      throw new Error(
        `[ModuleResult] Module '${this.id}' has no result for binding '${bindingId}'`
      );
    }

    return bindingState;
  }

  public getFailures(): Error[] {
    return [...this._bindings.values()]
      .filter((x): x is BindingStateFailure => x._kind === "failure")
      .map((x) => x.error);
  }

  public getHolds(): string[] {
    return [...this._bindings.values()]
      .filter((x): x is BindingStateHold => x._kind === "hold")
      .map((x) => x.reason);
  }

  public count(): number {
    return this._bindings.size;
  }

  public toModuleResult(): SerializedModuleResult {
    const moduleResult: SerializedModuleResult = {};

    for (const [bindingId, bindingState] of this._bindings.entries()) {
      if (bindingState._kind !== "success") {
        throw new Error(
          "toModuleResult can only be called in successful modules"
        );
      }
      moduleResult[bindingId] = serializeBindingOutput(bindingState.result);
    }

    return moduleResult;
  }

  private _getBinding(bindingId: string) {
    const bindingState = this._bindings.get(bindingId);

    if (bindingState === undefined) {
      throw new Error("assertion error");
    }

    return bindingState;
  }

  private _isBindingSuccess(bindingId: string): boolean {
    const bindingState = this._getBinding(bindingId);

    return bindingState._kind === "success";
  }

  private _isBindingFailure(bindingId: string): boolean {
    const bindingState = this._getBinding(bindingId);

    return bindingState._kind === "failure";
  }

  private _isBindingHold(bindingId: string): boolean {
    const bindingState = this._getBinding(bindingId);

    return bindingState._kind === "hold";
  }
}
