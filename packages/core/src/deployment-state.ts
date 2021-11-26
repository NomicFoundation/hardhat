import { BindingOutput } from "./bindings";
import { DAG, IgnitionModule } from "./modules";

export class DeploymentState {
  private _modules: Map<string, ModuleState> = new Map();

  public static clone(deploymentState: DeploymentState): DeploymentState {
    const clonedDeploymentState = new DeploymentState();
    for (const moduleState of deploymentState.getModules()) {
      const clonedModuleState = new ModuleState(moduleState.id);

      for (const [bindingId, bindingState] of moduleState.getBindingsStates()) {
        clonedModuleState.addBinding(bindingId, bindingState);
      }

      clonedDeploymentState.addModule(clonedModuleState);
    }

    return clonedDeploymentState;
  }

  public static fromDAG(dag: DAG): DeploymentState {
    const deploymentState = new DeploymentState();
    for (const ignitionModule of dag.getSortedModules()) {
      const moduleState = ModuleState.fromIgnitionModule(ignitionModule);
      deploymentState.addModule(moduleState);
    }

    return deploymentState;
  }

  public addModule(moduleState: ModuleState) {
    this._modules.set(moduleState.id, moduleState);
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

  public hasModule(moduleId: string) {
    return this._modules.has(moduleId);
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

  public isHold(): [string, string[]] | undefined {
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
  success(result: any): BindingState {
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
    return [...this._bindings.values()].some((b) => b._kind === "running");
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

  public isBindingDone(bindingId: string): boolean {
    return (
      this.isBindingSuccess(bindingId) ||
      this.isBindingFailure(bindingId) ||
      this.isBindingHold(bindingId)
    );
  }

  public isBindingSuccess(bindingId: string): boolean {
    const bindingState = this._getBinding(bindingId);

    return bindingState._kind === "success";
  }

  public isBindingFailure(bindingId: string): boolean {
    const bindingState = this._getBinding(bindingId);

    return bindingState._kind === "failure";
  }

  public isBindingHold(bindingId: string): boolean {
    const bindingState = this._getBinding(bindingId);

    return bindingState._kind === "hold";
  }

  public setSuccess(bindingId: string, result: any) {
    const bindingState = this._getBinding(bindingId);

    if (bindingState._kind !== "running") {
      throw new Error("assertion error");
    }

    this._bindings.set(bindingId, BindingState.success(result));
  }

  public setRunning(bindingId: string) {
    this._bindings.set(bindingId, BindingState.running());
  }

  public addFailure(bindingId: string, error: Error) {
    this._bindings.set(bindingId, BindingState.failure(error));
  }

  public setHold(bindingId: string, holdReason: string) {
    this._bindings.set(bindingId, BindingState.hold(holdReason));
  }

  public getBindingResult(bindingId: string): BindingOutput {
    const bindingState = this.getBindingState(bindingId);

    if (bindingState._kind !== "success") {
      throw new Error(`assertion error: ${bindingId} should be successful`);
    }

    return bindingState.result;
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

  private _getBinding(bindingId: string) {
    const bindingState = this._bindings.get(bindingId);

    if (bindingState === undefined) {
      throw new Error("assertion error");
    }

    return bindingState;
  }
}
