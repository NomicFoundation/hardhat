import { IgnitionError } from "../../../errors";
import { isDeploymentExecutionState } from "../../../internal/utils/guards";
import { isRuntimeValue } from "../../type-guards";
import { DeploymentResult } from "../../types/deployer";
import {
  ExecutionResultMessage,
  FutureRestartMessage,
  FutureStartMessage,
  JournalableMessage,
} from "../../types/journal";
import {
  AccountRuntimeValue,
  Future,
  FutureType,
  RuntimeValueType,
} from "../../types/module";
import { accountRuntimeValueToErrorString } from "../reconciliation/utils";
import { ExecutionEngineState } from "../types/execution-engine";
import { ExecutionStateMap, ExecutionStatus } from "../types/execution-state";
import { getFuturesFromModule } from "../utils/get-futures-from-module";

import { executionStateReducer } from "./executionStateReducer";
import { isExecutionResult, isOnChainAction, isOnchainResult } from "./guards";

type ExecutionBatch = Future[];

export class ExecutionEngine {
  public async execute(state: ExecutionEngineState): Promise<DeploymentResult> {
    const { batches, module } = state;

    const futures = getFuturesFromModule(module);

    for (const batch of batches) {
      // TODO: consider changing batcher to return futures rather than ids
      const executionBatch = batch.map((futureId) =>
        this._lookupFuture(futures, futureId)
      );

      const batchResult = await this._executeBatch(executionBatch, state);

      if (batchResult.some((b) => b.type === "execution-failure")) {
        return { status: "failed" };
      }

      if (batchResult.some((b) => b.type === "execution-hold")) {
        return { status: "hold" };
      }

      if (batchResult.every((b) => b.type !== "execution-success")) {
        throw new IgnitionError("Unexpected state");
      }
    }

    return {
      status: "success",
      contracts: this._resolveDeployedContractsFrom(state),
    };
  }

  private async _executeBatch(
    batch: ExecutionBatch,
    state: ExecutionEngineState
  ) {
    return Promise.all(
      batch.map((entry) => this._executeBatchEntry(entry, state))
    );
  }

  private async _executeBatchEntry(
    future: Future,
    state: ExecutionEngineState
  ): Promise<ExecutionResultMessage> {
    let current: JournalableMessage = this._startOrRestartFor(future, state);
    await this._apply(state, current);

    const context = {
      executionState: state.executionStateMap[future.id],
    };

    const exectionStrategy = state.strategy.executeStrategy(context);

    const dependencies = Array.from(context.executionState.dependencies);
    const deployedContracts = this._resolveDeployedContractsFrom(state);

    const libraries = Object.fromEntries(
      dependencies.map((id) => {
        const lib = deployedContracts[id];
        return [lib.contractName, lib.contractAddress];
      })
    );

    while (!isExecutionResult(current)) {
      context.executionState = state.executionStateMap[future.id];

      if (isOnChainAction(current)) {
        current = await state.transactionService.onchain(current, {
          libraries,
        });
      } else if (isOnchainResult(current)) {
        current = (await exectionStrategy.next(current)).value;
      } else {
        current = (await exectionStrategy.next(null)).value;
      }

      await this._apply(state, current);
    }

    return current;
  }

  private _startOrRestartFor(
    future: Future,
    state: ExecutionEngineState
  ): FutureStartMessage | FutureRestartMessage {
    const executionState = state.executionStateMap[future.id];

    if (executionState === undefined) {
      return this._initCommandFor(future, state);
    }

    return { type: "execution-restart", futureId: future.id };
  }

  private async _apply(
    state: ExecutionEngineState,
    message: JournalableMessage
  ): Promise<void> {
    await state.journal.record(message);
    state.executionStateMap = executionStateReducer(
      state.executionStateMap,
      message
    );
  }

  private _resolveAddress(
    potential: string | AccountRuntimeValue | undefined,
    { accounts }: { accounts: string[] }
  ) {
    if (typeof potential === "string") {
      return potential;
    }

    if (
      isRuntimeValue(potential) &&
      potential.type === RuntimeValueType.ACCOUNT
    ) {
      return accounts[potential.accountIndex];
    }

    if (potential === undefined) {
      return accounts[0];
    }

    throw new IgnitionError(
      `Unable to resolve address: ${accountRuntimeValueToErrorString(
        potential
      )} `
    );
  }

  private _initCommandFor(
    future: Future,
    { accounts }: { executionStateMap: ExecutionStateMap; accounts: string[] }
  ): FutureStartMessage {
    const strategy = "basic";
    let state: FutureStartMessage;

    switch (future.type) {
      case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
        state = {
          type: "execution-start",
          futureId: future.id,
          futureType: future.type,
          strategy,
          // status: ExecutionStatus.STARTED,
          dependencies: [...future.dependencies].map((f) => f.id),
          // history: [],
          storedArtifactPath: "./artifact.json",
          storedBuildInfoPath: "./build-info.json",
          contractName: future.contractName,
          value: future.value.toString(),
          constructorArgs: future.constructorArgs,
          libraries: Object.fromEntries(
            Object.entries(future.libraries).map(([key, lib]) => [key, lib.id])
          ),
          from: this._resolveAddress(future.from, { accounts }),
        };
        return state;
      case FutureType.NAMED_CONTRACT_DEPLOYMENT:
        state = {
          type: "execution-start",
          futureId: future.id,
          futureType: future.type,
          strategy,
          // status: ExecutionStatus.STARTED,
          dependencies: [...future.dependencies].map((f) => f.id),
          // history: [],
          storedArtifactPath: "./artifact.json",
          storedBuildInfoPath: "./build-info.json",
          contractName: future.contractName,
          value: future.value.toString(),
          constructorArgs: future.constructorArgs,
          libraries: Object.fromEntries(
            Object.entries(future.libraries).map(([key, lib]) => [key, lib.id])
          ),
          from: this._resolveAddress(future.from, { accounts }),
        };
        return state;
      case FutureType.NAMED_LIBRARY_DEPLOYMENT:
        state = {
          type: "execution-start",
          futureId: future.id,
          futureType: future.type,
          strategy,
          // status: ExecutionStatus.STARTED,
          dependencies: [...future.dependencies].map((f) => f.id),
          // history: [],
          storedArtifactPath: "./artifact.json",
          storedBuildInfoPath: "./build-info.json",
          contractName: future.contractName,
          value: "0",
          constructorArgs: [],
          libraries: Object.fromEntries(
            Object.entries(future.libraries).map(([key, lib]) => [key, lib.id])
          ),
          from: this._resolveAddress(future.from, { accounts }),
        };
        return state;
      case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
        state = {
          type: "execution-start",
          futureId: future.id,
          futureType: future.type,
          strategy,
          // status: ExecutionStatus.STARTED,
          dependencies: [...future.dependencies].map((f) => f.id),
          // history: [],
          storedArtifactPath: "./artifact.json",
          storedBuildInfoPath: "./build-info.json",
          contractName: future.contractName,
          value: "0",
          constructorArgs: [],
          libraries: Object.fromEntries(
            Object.entries(future.libraries).map(([key, lib]) => [key, lib.id])
          ),
          from: this._resolveAddress(future.from, { accounts }),
        };
        return state;
      case FutureType.NAMED_CONTRACT_CALL:
      case FutureType.NAMED_STATIC_CALL:
      case FutureType.NAMED_CONTRACT_AT:
      case FutureType.ARTIFACT_CONTRACT_AT:
      case FutureType.READ_EVENT_ARGUMENT:
      case FutureType.SEND_DATA: {
        throw new Error(`Not implemented yet: FutureType ${future.type}`);
      }
    }
  }

  private _lookupFuture(futures: Future[], futureId: string): Future {
    const future = futures.find((f) => f.id === futureId);

    if (future === undefined) {
      throw new IgnitionError("Could not locate future id from batching");
    }

    return future;
  }

  private _resolveDeployedContractsFrom({
    executionStateMap,
  }: ExecutionEngineState): Record<
    string,
    { contractName: string; contractAddress: string }
  > {
    return Object.fromEntries(
      Object.values(executionStateMap)
        .filter(isDeploymentExecutionState)
        .filter((des) => des.status === ExecutionStatus.SUCCESS)
        .map((des) => [
          des.id,
          {
            contractName: des.contractName,
            contractAddress: des.contractAddress!,
          },
        ])
    );
  }
}
