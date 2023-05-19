import type { IgnitionModuleResult, ModuleParameters } from "./types/module";
import type { IgnitionModuleDefinition } from "./types/module-builder";

import { Batcher } from "./internal/batcher";
import { ExecutionEngine } from "./internal/execution-engine";
import { ModuleConstructor } from "./internal/module-builder";
import { Reconcilier } from "./internal/reconciliation/reconcilier";
import { ExecutionStateMap } from "./types/execution-state";

export class Deployer {
  private _moduleConstructor: ModuleConstructor;
  private _executionEngine: ExecutionEngine;

  constructor() {
    this._moduleConstructor = new ModuleConstructor();
    this._executionEngine = new ExecutionEngine();
  }

  public async deploy(
    moduleDefinition: IgnitionModuleDefinition<
      string,
      string,
      IgnitionModuleResult<string>
    >,
    moduleParameters: ModuleParameters,
    accounts: string[]
  ) {
    const module = this._moduleConstructor.construct(moduleDefinition);

    const previousStateMap = await this._loadExecutionStateFromJournal();

    const reconciliationResult = Reconcilier.reconcile(
      module,
      previousStateMap,
      moduleParameters,
      accounts
    );

    if (reconciliationResult.reconciliationFailures.length > 0) {
      throw new Error("Reconciliation failed");
    }

    if (reconciliationResult.missingExecutedFutures.length > 0) {
      // TODO: indicate to UI that warnings should be shown
    }

    const batches = Batcher.batch(module, previousStateMap);

    return this._executionEngine.execute({
      batches,
      module,
      executionStateMap: previousStateMap,
    });
  }

  private async _loadExecutionStateFromJournal(): Promise<ExecutionStateMap> {
    // TODO: load an actual journal
    return {};
  }
}
