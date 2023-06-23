import identity from "lodash/identity";

import { IgnitionError } from "../../../errors";
import { ArtifactResolver } from "../../types/artifact";
import { DeploymentResult } from "../../types/deployer";
import { DeploymentLoader } from "../../types/deployment-loader";
import {
  ExecutionResultMessage,
  FutureRestartMessage,
  FutureStartMessage,
  JournalableMessage,
} from "../../types/journal";
import {
  ArgumentType,
  Future,
  FutureType,
  ModuleParameters,
  NamedContractDeploymentFuture,
  NamedLibraryDeploymentFuture,
} from "../../types/module";
import { isDeploymentExecutionState } from "../type-guards";
import { ExecutionEngineState } from "../types/execution-engine";
import { ExecutionStateMap, ExecutionStatus } from "../types/execution-state";
import { getFuturesFromModule } from "../utils/get-futures-from-module";
import { replaceWithinArg } from "../utils/replace-within-arg";
import { resolveFromAddress } from "../utils/resolve-from-address";
import { resolveFutureToValue } from "../utils/resolve-future-to-value";
import { resolveModuleParameter } from "../utils/resolve-module-parameter";

import { executionStateReducer } from "./executionStateReducer";
import {
  isDeployedContractExecutionSuccess,
  isExecutionResult,
  isOnChainAction,
  isOnchainResult,
} from "./guards";

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
      module: state.module,
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
    let current: JournalableMessage = await this._startOrRestartFor(
      future,
      state
    );

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

  private async _startOrRestartFor(
    future: Future,
    state: ExecutionEngineState
  ): Promise<FutureStartMessage | FutureRestartMessage> {
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
    // NOTE: recording to the journal is a sync operation
    state.deploymentLoader.journal.record(message);

    if (isDeployedContractExecutionSuccess(message)) {
      await state.deploymentLoader.recordDeployedAddress(
        message.futureId,
        message.contractAddress
      );
    }

    state.executionStateMap = executionStateReducer(
      state.executionStateMap,
      message
    );
  }

  private async _initCommandFor(
    future: Future,
    {
      executionStateMap,
      accounts,
      artifactResolver,
      deploymentLoader,
      deploymentParameters,
    }: {
      executionStateMap: ExecutionStateMap;
      accounts: string[];
      artifactResolver: ArtifactResolver;
      deploymentLoader: DeploymentLoader;
      deploymentParameters: { [key: string]: ModuleParameters };
    }
  ): Promise<FutureStartMessage> {
    const strategy = "basic";
    let state: FutureStartMessage;

    switch (future.type) {
      case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
        const artifactContractPath = await deploymentLoader.storeArtifact(
          future.id,
          future.artifact
        );

        state = {
          type: "execution-start",
          futureId: future.id,
          futureType: future.type,
          strategy,
          // status: ExecutionStatus.STARTED,
          dependencies: [...future.dependencies].map((f) => f.id),
          // history: [],
          storedArtifactPath: artifactContractPath,
          storedBuildInfoPath: undefined,
          contractName: future.contractName,
          value: future.value.toString(),
          constructorArgs: future.constructorArgs,
          libraries: Object.fromEntries(
            Object.entries(future.libraries).map(([key, lib]) => [key, lib.id])
          ),
          from: resolveFromAddress(future.from, { accounts }),
        };

        return state;
      case FutureType.NAMED_CONTRACT_DEPLOYMENT:
        const {
          storedArtifactPath: namedContractArtifactPath,
          storedBuildInfoPath: namedContractBuildInfoPath,
        } = await this._storeArtifactAndBuildInfoAgainstDeployment(future, {
          artifactResolver,
          deploymentLoader,
        });

        state = {
          type: "execution-start",
          futureId: future.id,
          futureType: future.type,
          strategy,
          dependencies: [...future.dependencies].map((f) => f.id),
          storedArtifactPath: namedContractArtifactPath,
          storedBuildInfoPath: namedContractBuildInfoPath,
          contractName: future.contractName,
          value: future.value.toString(),
          constructorArgs: this._resolveArgs(future.constructorArgs, {
            accounts,
            deploymentParameters,
            executionStateMap,
          }),
          libraries: Object.fromEntries(
            Object.entries(future.libraries).map(([key, lib]) => [key, lib.id])
          ),
          from: resolveFromAddress(future.from, { accounts }),
        };

        return state;
      case FutureType.NAMED_LIBRARY_DEPLOYMENT:
        const {
          storedArtifactPath: namedLibArtifactPath,
          storedBuildInfoPath: namedLibBuildInfoPath,
        } = await this._storeArtifactAndBuildInfoAgainstDeployment(future, {
          artifactResolver,
          deploymentLoader,
        });

        state = {
          type: "execution-start",
          futureId: future.id,
          futureType: future.type,
          strategy,
          dependencies: [...future.dependencies].map((f) => f.id),
          storedArtifactPath: namedLibArtifactPath,
          storedBuildInfoPath: namedLibBuildInfoPath,
          contractName: future.contractName,
          value: "0",
          constructorArgs: [],
          libraries: Object.fromEntries(
            Object.entries(future.libraries).map(([key, lib]) => [key, lib.id])
          ),
          from: resolveFromAddress(future.from, { accounts }),
        };

        return state;
      case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
        const artifactLibraryPath = await deploymentLoader.storeArtifact(
          future.id,
          future.artifact
        );

        state = {
          type: "execution-start",
          futureId: future.id,
          futureType: future.type,
          strategy,
          dependencies: [...future.dependencies].map((f) => f.id),
          storedArtifactPath: artifactLibraryPath,
          storedBuildInfoPath: undefined,
          contractName: future.contractName,
          value: "0",
          constructorArgs: [],
          libraries: Object.fromEntries(
            Object.entries(future.libraries).map(([key, lib]) => [key, lib.id])
          ),
          from: resolveFromAddress(future.from, { accounts }),
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

  private async _storeArtifactAndBuildInfoAgainstDeployment(
    future:
      | NamedLibraryDeploymentFuture<string>
      | NamedContractDeploymentFuture<string>,
    {
      deploymentLoader,
      artifactResolver,
    }: {
      deploymentLoader: DeploymentLoader;
      artifactResolver: ArtifactResolver;
    }
  ) {
    const artifact = await artifactResolver.loadArtifact(future.contractName);
    const storedArtifactPath = await deploymentLoader.storeArtifact(
      future.id,
      artifact
    );
    const buildInfo = await artifactResolver.getBuildInfo(future.contractName);
    const storedBuildInfoPath =
      buildInfo === undefined
        ? undefined
        : await deploymentLoader.storeBuildInfo(buildInfo);

    return { storedArtifactPath, storedBuildInfoPath };
  }

  private _resolveArgs(
    args: ArgumentType[],
    context: {
      deploymentParameters: { [key: string]: ModuleParameters };
      accounts: string[];
      executionStateMap: ExecutionStateMap;
    }
  ) {
    const replace = (arg: ArgumentType) =>
      replaceWithinArg<ArgumentType>(arg, {
        bigint: identity,
        future: (f) => {
          return resolveFutureToValue(f, context);
        },
        accountRuntimeValue: (arv) => context.accounts[arv.accountIndex],
        moduleParameterRuntimeValue: (mprv) => {
          return resolveModuleParameter(mprv, context);
        },
      });

    return args.map(replace);
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
    {
      contractName: string;
      contractAddress: string;
      storedArtifactPath: string;
    }
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
            storedArtifactPath: des.storedArtifactPath,
          },
        ])
    );
  }
}
