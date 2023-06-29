import identity from "lodash/identity";

import { IgnitionError } from "../../../errors";
import { isModuleParameterRuntimeValue } from "../../type-guards";
import { ArtifactResolver } from "../../types/artifact";
import { DeploymentResult } from "../../types/deployer";
import { DeploymentLoader } from "../../types/deployment-loader";
import {
  ExecutionFailure,
  ExecutionResultMessage,
  FutureStartMessage,
  JournalableMessage,
  OnchainResultFailureMessage,
} from "../../types/journal";
import {
  AccountRuntimeValue,
  ArgumentType,
  Future,
  FutureType,
  ModuleParameters,
  NamedContractAtFuture,
  NamedContractDeploymentFuture,
  NamedLibraryDeploymentFuture,
} from "../../types/module";
import {
  isFutureStartMessage,
  isOnChainFailureMessage,
  isOnChainSuccessMessage,
  isWipeMessage,
} from "../journal/type-guards";
import {
  isCallExecutionState,
  isContractAtExecutionState,
  isDeploymentExecutionState,
  isSendDataExecutionState,
  isStaticCallExecutionState,
} from "../type-guards";
import {
  ExecutionEngineState,
  ExecutionStrategyContext,
} from "../types/execution-engine";
import {
  DeploymentExecutionState,
  ExecutionStateMap,
  ExecutionStatus,
} from "../types/execution-state";
import { assertIgnitionInvariant } from "../utils/assertions";
import { getFuturesFromModule } from "../utils/get-futures-from-module";
import { replaceWithinArg } from "../utils/replace-within-arg";
import { resolveFromAddress } from "../utils/resolve-from-address";
import { resolveFutureToValue } from "../utils/resolve-future-to-value";
import { resolveModuleParameter } from "../utils/resolve-module-parameter";

import { executionStateReducer } from "./executionStateReducer";
import {
  isDeployedContractExecutionSuccess,
  isExecutionFailure,
  isExecutionResultMessage,
  isOnChainAction,
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

      if (batchResult.some(isExecutionFailure)) {
        return {
          status: "failure",
          errors: Object.fromEntries(
            batchResult
              .filter(isExecutionFailure)
              .map((r) => [r.futureId, r.error])
          ),
        };
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
    let current: JournalableMessage = await this._initCommandFor(future, state);

    await this._apply(state, current);

    const context = this._setupExecutionStrategyContext(future, state);
    const exectionStrategy = state.strategy.executeStrategy(context);

    const dependencies = Array.from(context.executionState.dependencies);
    const deployedContracts = this._resolveDeployedContractsFrom(state);

    const libraries = Object.fromEntries(
      dependencies
        .filter((id) => deployedContracts[id] !== undefined)
        .map((id) => {
          const lib = deployedContracts[id];
          return [lib.contractName, lib.contractAddress];
        })
    );

    while (!isExecutionResultMessage(current)) {
      context.executionState = state.executionStateMap[future.id];

      if (isOnChainAction(current)) {
        current = await state.transactionService.onchain(current, {
          libraries,
        });
      } else if (isOnChainSuccessMessage(current)) {
        current = (await exectionStrategy.next(current)).value;
      } else if (isOnChainFailureMessage(current)) {
        current = this._convertToExecutionFailure(current);
      } else if (isFutureStartMessage(current)) {
        current = (await exectionStrategy.next(null)).value;
      } else if (isWipeMessage(current)) {
        // ignore - we should never get wipe messages
        continue;
      } else {
        this._assertNeverJournalableMessage(current);
      }

      await this._apply(state, current);
    }

    return current;
  }

  private _assertNeverJournalableMessage(message: never) {
    throw new IgnitionError(`Unrecognized message ${JSON.stringify(message)}`);
  }

  private _convertToExecutionFailure(
    current: OnchainResultFailureMessage
  ): ExecutionFailure {
    return {
      type: "execution-failure",
      futureId: current.futureId,
      error: current.error,
    };
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
          constructorArgs: this._resolveArgs(future.constructorArgs, {
            accounts,
            deploymentParameters,
            executionStateMap,
          }),
          libraries: Object.fromEntries(
            Object.entries(future.libraries).map(([key, lib]) => [key, lib.id])
          ),
          from: this._resolveAddress(future.from, { accounts }),
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
          from: this._resolveAddress(future.from, { accounts }),
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
          from: this._resolveAddress(future.from, { accounts }),
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
          from: this._resolveAddress(future.from, { accounts }),
        };

        return state;
      case FutureType.NAMED_CONTRACT_CALL: {
        const { contractAddress, storedArtifactPath } = executionStateMap[
          future.contract.id
        ] as DeploymentExecutionState;

        assertIgnitionInvariant(
          contractAddress !== undefined,
          `Internal error - dependency ${future.contract.id} used before it's resolved`
        );

        state = {
          type: "execution-start",
          futureId: future.id,
          futureType: future.type,
          strategy,
          // status: ExecutionStatus.STARTED,
          dependencies: [...future.dependencies].map((f) => f.id),
          // history: [],
          args: this._resolveArgs(future.args, {
            accounts,
            deploymentParameters,
            executionStateMap,
          }),
          functionName: future.functionName,
          contractAddress,
          storedArtifactPath,
          value: future.value.toString(),
          from: resolveFromAddress(future.from, { accounts }),
        };
        return state;
      }
      case FutureType.NAMED_STATIC_CALL: {
        const { contractAddress, storedArtifactPath } = executionStateMap[
          future.contract.id
        ] as DeploymentExecutionState;

        assertIgnitionInvariant(
          contractAddress !== undefined,
          `Internal error - dependency ${future.contract.id} used before it's resolved`
        );

        state = {
          type: "execution-start",
          futureId: future.id,
          futureType: future.type,
          strategy,
          // status: ExecutionStatus.STARTED,
          dependencies: [...future.dependencies].map((f) => f.id),
          // history: [],
          args: this._resolveArgs(future.args, {
            accounts,
            deploymentParameters,
            executionStateMap,
          }),
          functionName: future.functionName,
          contractAddress,
          storedArtifactPath,
          from: resolveFromAddress(future.from, { accounts }),
        };
        return state;
      }
      case FutureType.READ_EVENT_ARGUMENT: {
        // TODO: This should also support contractAt
        const { contractAddress, storedArtifactPath } = executionStateMap[
          future.emitter.id
        ] as DeploymentExecutionState;

        // TODO: This should support multiple transactions
        const { txId } = executionStateMap[
          future.futureToReadFrom.id
        ] as DeploymentExecutionState;

        assertIgnitionInvariant(
          contractAddress !== undefined,
          `Internal error - dependency ${future.emitter.id} used before it's resolved`
        );

        assertIgnitionInvariant(
          txId !== undefined,
          `Internal error - dependency ${future.futureToReadFrom.id} used before it's resolved`
        );

        state = {
          type: "execution-start",
          futureId: future.id,
          futureType: future.type,
          strategy,
          // status: ExecutionStatus.STARTED,
          dependencies: [...future.dependencies].map((f) => f.id),
          // history: [],
          storedArtifactPath,
          eventName: future.eventName,
          argumentName: future.argumentName,
          txToReadFrom: txId,
          emitterAddress: contractAddress,
          eventIndex: future.eventIndex,
        };
        return state;
      }
      case FutureType.SEND_DATA: {
        let to: string;
        if (typeof future.to === "string") {
          to = future.to;
        } else if (isModuleParameterRuntimeValue(future.to)) {
          to = resolveModuleParameter(future.to, {
            deploymentParameters,
          }) as string;
        } else {
          // TODO: reconsider this with contractAt
          const { contractAddress } = executionStateMap[
            future.to.id
          ] as DeploymentExecutionState;

          assertIgnitionInvariant(
            contractAddress !== undefined,
            `Internal error - dependency ${future.to.id} used before it's resolved`
          );

          to = contractAddress;
        }

        state = {
          type: "execution-start",
          futureId: future.id,
          futureType: future.type,
          strategy,
          // status: ExecutionStatus.STARTED,
          dependencies: [...future.dependencies].map((f) => f.id),
          // history: [],
          value: future.value.toString(),
          data: future.data ?? "0x",
          to,
          from: resolveFromAddress(future.from, { accounts }),
        };
        return state;
      }
      case FutureType.NAMED_CONTRACT_AT: {
        let address: string;
        if (typeof future.address === "string") {
          address = future.address;
        } else if (isModuleParameterRuntimeValue(future.address)) {
          address = resolveModuleParameter(future.address, {
            deploymentParameters,
          }) as string;
        } else {
          const { contractAddress } = executionStateMap[
            future.address.id
          ] as DeploymentExecutionState;

          assertIgnitionInvariant(
            contractAddress !== undefined,
            `Internal error - dependency ${future.address.id} used before it's resolved`
          );

          address = contractAddress;
        }

        const {
          storedArtifactPath: namedContractAtArtifactPath,
          storedBuildInfoPath: namedContractAtBuildInfoPath,
        } = await this._storeArtifactAndBuildInfoAgainstDeployment(future, {
          artifactResolver,
          deploymentLoader,
        });

        state = {
          type: "execution-start",
          futureId: future.id,
          futureType: future.type,
          strategy,
          // status: ExecutionStatus.STARTED,
          dependencies: [...future.dependencies].map((f) => f.id),
          // history: [],
          contractName: future.contractName,
          contractAddress: address,
          storedArtifactPath: namedContractAtArtifactPath,
          storedBuildInfoPath: namedContractAtBuildInfoPath,
        };
        return state;
      }
      case FutureType.ARTIFACT_CONTRACT_AT: {
        let address: string;
        if (typeof future.address === "string") {
          address = future.address;
        } else if (isModuleParameterRuntimeValue(future.address)) {
          address = resolveModuleParameter(future.address, {
            deploymentParameters,
          }) as string;
        } else {
          const { contractAddress } = executionStateMap[
            future.address.id
          ] as DeploymentExecutionState;

          assertIgnitionInvariant(
            contractAddress !== undefined,
            `Internal error - dependency ${future.address.id} used before it's resolved`
          );

          address = contractAddress;
        }

        const artifactContractAtPath = await deploymentLoader.storeArtifact(
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
          contractName: future.contractName,
          contractAddress: address,
          storedArtifactPath: artifactContractAtPath,
          storedBuildInfoPath: undefined,
        };
        return state;
      }
      default:
        throw new Error(`Unknown future`);
    }
  }

  /**
   * Resolve the address like from to either undefined - which passes the
   * user intent to the execution strategy, or to a usable string address.
   */
  private _resolveAddress(
    from: string | AccountRuntimeValue | undefined,
    { accounts }: { accounts: string[] }
  ): string | undefined {
    if (from === undefined) {
      return undefined;
    }

    return resolveFromAddress(from, { accounts });
  }

  private async _storeArtifactAndBuildInfoAgainstDeployment(
    future:
      | NamedLibraryDeploymentFuture<string>
      | NamedContractDeploymentFuture<string>
      | NamedContractAtFuture<string>,
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
    const deployments = Object.values(executionStateMap)
      .filter(isDeploymentExecutionState)
      .filter((des) => des.status === ExecutionStatus.SUCCESS)
      .map((des) => [
        des.id,
        {
          contractName: des.contractName,
          contractAddress: des.contractAddress!,
          storedArtifactPath: des.storedArtifactPath,
        },
      ]);

    const contractAts = Object.values(executionStateMap)
      .filter(isContractAtExecutionState)
      .filter((des) => des.status === ExecutionStatus.SUCCESS)
      .map((des) => [
        des.id,
        {
          contractName: des.contractName,
          contractAddress: des.contractAddress!,
          storedArtifactPath: des.storedArtifactPath,
        },
      ]);

    return Object.fromEntries([...deployments, ...contractAts]);
  }

  private _setupExecutionStrategyContext(
    future: Future,
    state: ExecutionEngineState
  ): ExecutionStrategyContext {
    const exState = state.executionStateMap[future.id];

    const sender =
      isDeploymentExecutionState(exState) ||
      isCallExecutionState(exState) ||
      isStaticCallExecutionState(exState) ||
      isSendDataExecutionState(exState)
        ? exState.from ?? state.accounts[0]
        : undefined;

    const context = {
      executionState: exState,
      sender,
    };

    return context;
  }
}
