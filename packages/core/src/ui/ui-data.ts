export interface UiExecutor {
  id: string;
  status: "ready" | "executing" | "success" | "failure" | "hold";
  message?: string;
}

export interface UiModule {
  id: string;
  status: "ready" | "deploying" | "deployed";
  executors: Map<string, UiExecutor>;
}

export class UiData {
  private _modules: Map<string, UiModule>;

  constructor(ids: Record<string, string[]>) {
    this._modules = new Map();

    for (const [moduleId, executorIds] of Object.entries(ids)) {
      const executors: Map<string, UiExecutor> = new Map();
      for (const executorId of executorIds) {
        executors.set(executorId, {
          id: executorId,
          status: "ready",
        });
      }
      this._modules.set(moduleId, {
        id: moduleId,
        status: "ready",
        executors,
      });
    }
  }

  public executorStart(moduleId: string, executorId: string) {
    const module = this._getModule(moduleId);

    if (module.status === "ready") {
      module.status = "deploying";
    } else if (module.status !== "deploying") {
      throw new Error(
        `[Assertion error] Module ${moduleId} should be ready or deploying`
      );
    }

    const executor = this._getExecutor(moduleId, executorId);

    if (executor.status !== "ready") {
      throw new Error(
        `[Assertion error] Executor ${executorId} should be ready`
      );
    }

    executor.status = "executing";
  }

  public executorSuccessful(moduleId: string, executorId: string) {
    const module = this._getModule(moduleId);

    if (module.status !== "deploying") {
      throw new Error(
        `[Assertion error] Module ${moduleId} should be deploying`
      );
    }

    const executor = this._getExecutor(moduleId, executorId);

    if (executor.status !== "executing") {
      throw new Error(
        `[Assertion error] Executor ${executorId} should be executing`
      );
    }

    executor.status = "success";

    if (this._isModuleFinished(module)) {
      module.status = "deployed";
    }
  }

  public executorHold(moduleId: string, executorId: string, _reason: string) {
    const module = this._getModule(moduleId);

    if (module.status !== "deploying") {
      throw new Error(
        `[Assertion error] Module ${moduleId} should be deploying`
      );
    }

    const executor = this._getExecutor(moduleId, executorId);

    if (executor.status !== "executing") {
      throw new Error(
        `[Assertion error] Executor ${executorId} should be executing`
      );
    }

    executor.status = "hold";

    if (this._isModuleFinished(module)) {
      module.status = "deployed";
    }
  }

  public executorFailure(
    moduleId: string,
    executorId: string,
    _reason: string
  ) {
    const module = this._getModule(moduleId);

    if (module.status !== "deploying") {
      throw new Error(
        `[Assertion error] Module ${moduleId} should be deploying`
      );
    }

    const executor = this._getExecutor(moduleId, executorId);

    if (executor.status !== "executing") {
      throw new Error(
        `[Assertion error] Executor ${executorId} should be executing`
      );
    }

    executor.status = "failure";

    if (this._isModuleFinished(module)) {
      module.status = "deployed";
    }
  }

  public getSuccessfulModules() {
    return [...this._modules.values()].filter((m) => m.status === "deployed");
  }

  public getModulesCount(): number {
    return this._modules.size;
  }

  public getDeployedModulesCount(): number {
    const modules = [...this._modules.values()];
    return modules.filter((m) => m.status === "deployed").length;
  }

  public getCurrentModule(): UiModule | undefined {
    const modulesBeingDeployed = [...this._modules.values()].filter(
      (m) => m.status === "deploying"
    );

    if (modulesBeingDeployed.length === 0) {
      return;
    }

    if (modulesBeingDeployed.length > 1) {
      throw new Error(
        `[Assertion error] Only one module should be deployed at the same time`
      );
    }

    return modulesBeingDeployed[0];
  }

  private _getModule(moduleId: string): UiModule {
    const module = this._modules.get(moduleId);

    if (module === undefined) {
      throw new Error(`[Assertion error] Expected module ${moduleId} to exist`);
    }

    return module;
  }

  private _getExecutor(moduleId: string, executorId: string): UiExecutor {
    const executor = this._modules.get(moduleId)?.executors.get(executorId);

    if (executor === undefined) {
      throw new Error(
        `[Assertion error] Expected executor ${moduleId}/${executorId} to exist`
      );
    }

    return executor;
  }

  private _isModuleFinished(module: UiModule) {
    return [...module.executors.values()].every(
      (e) =>
        e.status === "success" || e.status === "hold" || e.status === "failure"
    );
  }
}
