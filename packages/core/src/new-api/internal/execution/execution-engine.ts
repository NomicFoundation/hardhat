import groupBy from "lodash/groupBy";
import identity from "lodash/identity";
import maxBy from "lodash/maxBy";
import sortBy from "lodash/sortBy";
import uniq from "lodash/uniq";

import { IgnitionError } from "../../../errors";
import { sleep } from "../../../internal/utils/sleep";
import {
  isFutureThatSubmitsOnchainTransaction,
  isModuleParameterRuntimeValue,
} from "../../type-guards";
import { ArtifactResolver } from "../../types/artifact";
import { DeploymentResult } from "../../types/deployer";
import { DeploymentLoader } from "../../types/deployment-loader";
import {
  ExecutionResultMessage,
  ExecutionTimeout,
  FutureStartMessage,
  JournalableMessage,
  OnchainTransactionReset,
  StartRunMessage,
  TransactionMessage,
} from "../../types/journal";
import {
  AccountRuntimeValue,
  ArgumentType,
  ContractFuture,
  Future,
  FutureType,
  ModuleParameters,
  NamedContractAtFuture,
  NamedContractDeploymentFuture,
  NamedLibraryDeploymentFuture,
} from "../../types/module";
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
import {
  resolveContractFutureToAddress,
  resolveFutureToValue,
} from "../utils/resolve-futures";
import { resolveModuleParameter } from "../utils/resolve-module-parameter";

import { executionStateReducer } from "./execution-state-reducer";
import { ExecutionStategyCycler } from "./execution-strategy-cycler";
import {
  isDeployedContractExecutionSuccess,
  isExecutionFailure,
  isExecutionHold,
  isExecutionResultMessage,
  isExecutionSuccess,
  isExecutionTimeout,
} from "./guards";
import { onchainStateTransitions } from "./onchain-state-transitions";
import { sortFuturesByNonces } from "./sort-futures-by-nonces";

type ExecutionBatch = Future[];

export interface AccountsState {
  [key: string]: number;
}

interface InflightTransaction {
  futureId: string;
  executionId: number;
  from: string;
  nonce: number;
  hash: string;
}

export class ExecutionEngine {
  public async execute(state: ExecutionEngineState): Promise<DeploymentResult> {
    const { batches, module } = state;

    // Initialise the current block number/hash
    state.block = await state.chainDispatcher.getCurrentBlock();

    const futures = getFuturesFromModule(module);

    await this._checkNonces(state, futures);

    // Record start of the run (which resets timeout to started)
    const startRun: StartRunMessage = {
      type: "run-start",
    };

    await this._apply(state, startRun);

    for (const batch of batches) {
      // TODO: consider changing batcher to return futures rather than ids
      const executionBatch = batch.map((futureId) =>
        this._lookupFuture(futures, futureId)
      );

      const batchResult = await this._executeBatch(executionBatch, state);

      assertIgnitionInvariant(
        batchResult.length === batch.length,
        "All futures should have reached a completion state"
      );

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

      if (batchResult.some(isExecutionTimeout)) {
        return {
          status: "timeout",
          timeouts: batchResult.filter(isExecutionTimeout).map((r) => ({
            futureId: r.futureId,
            executionId: r.executionId,
            txHash: r.txHash,
          })),
        };
      }

      if (batchResult.some(isExecutionHold)) {
        return { status: "hold" };
      }

      if (batchResult.every((b) => !isExecutionSuccess(b))) {
        throw new IgnitionError("Unexpected state");
      }
    }

    return {
      status: "success",
      contracts: this._resolveDeployedContractsFrom(state),
      module: state.module,
    };
  }

  private async _checkNonces(state: ExecutionEngineState, futures: Future[]) {
    const transactionSubmittingFutures = futures.filter(
      isFutureThatSubmitsOnchainTransaction
    );

    const usedAccounts = uniq(
      transactionSubmittingFutures.map((f) => resolveFromAddress(f.from, state))
    );

    const pendingIgnitionTransactions: InflightTransaction[] =
      transactionSubmittingFutures
        .map((f) => {
          const exState = state.executionStateMap[f.id];

          if (
            exState === undefined ||
            exState.onchain.currentExecution === null ||
            exState.onchain.nonce === null ||
            exState.onchain.txHash === null
          ) {
            return null;
          }

          return {
            futureId: f.id,
            executionId: exState.onchain.currentExecution,
            from: resolveFromAddress(f.from, state),
            nonce: exState.onchain.nonce,
            hash: exState.onchain.txHash,
          };
        })
        .filter(<T>(x: T | null): x is T => x !== null);

    const inflightByAccount = groupBy(pendingIgnitionTransactions, "from");

    for (const usedAccount of usedAccounts) {
      const pending = await state.chainDispatcher.getPendingTransactionCount(
        usedAccount
      );
      const latest = await state.chainDispatcher.getLatestTransactionCount(
        usedAccount
      );

      const inflight = inflightByAccount[usedAccount];

      // no inflight transactions
      if (inflight === undefined) {
        if (pending !== latest) {
          throw new IgnitionError(
            `Pending transactions for account: ${usedAccount}, please wait for transactions to complete before running a deploy`
          );
        }

        // no pending transactions
        return;
      }

      // The pending transactions do not match the expected list
      // given the inflight transactions from the previous run
      if (this._isMorePendingThanPreviousRunIndicates(pending, inflight)) {
        // TODO: is this error message correct?
        throw new IgnitionError(
          `Pending transactions for account: ${usedAccount}, please wait for transactions to complete before running a deploy`
        );
      }

      for (const inflightTran of sortBy(inflight, "nonce")) {
        const result = await state.chainDispatcher.getTransaction(
          inflightTran.hash
        );

        // transaction is confirmed or pending as expected
        if (result !== null && result !== undefined) {
          continue;
        }

        // There is a confirmed user sent transaction that
        // has replaced the expected transaction
        if (
          this._isIgnitionTranReplacedByConfirmedInterferingTran(
            inflightTran,
            latest
          )
        ) {
          // Try sending the request again, using a new nonce
          const revert: OnchainTransactionReset = {
            type: "onchain-transaction-reset",
            futureId: inflightTran.futureId,
            executionId: inflightTran.executionId,
          };

          await this._apply(state, revert);
        }

        // there is a pending transaction sent by the user
        // with the same nonce
        if (
          this._isIgnitionTranReplacedByPendingInterferingTran(
            inflightTran,
            latest,
            pending
          )
        ) {
          throw new IgnitionError("Pending transaction from user");
        }

        // the transaction has been dropped without any user interference
        if (
          this._inflightTranDroppedWithoutInterference(
            inflightTran,
            latest,
            pending
          )
        ) {
          // try sending again potentially using the same nonce
          const revert: OnchainTransactionReset = {
            type: "onchain-transaction-reset",
            futureId: inflightTran.futureId,
            executionId: inflightTran.executionId,
          };

          await this._apply(state, revert);
        }

        assertIgnitionInvariant(
          true,
          `Unexpected nonce check state for account ${usedAccount}`
        );
      }

      // There are pending transactions but they are accounted for
      // by the inflight transactions from the previous run,
      // including those that confirmed between runs
      return;
    }
  }

  private async _executeBatch(
    batch: ExecutionBatch,
    state: ExecutionEngineState
  ): Promise<ExecutionResultMessage[]> {
    // TODO: replace this with deriving the batch results from the
    // execution state at the end.
    let batchResults: ExecutionResultMessage[] = [];

    // initialize all futures
    // TODO: reconsider if this can be delayed until the first on-chain
    // submission, to reduce restart state
    for (const future of batch) {
      if (state.executionStateMap[future.id] !== undefined) {
        continue;
      }

      const initMessage: JournalableMessage = await this._initCommandFor(
        future,
        state
      );

      await this._apply(state, initMessage);
    }

    while (!this._isBatchComplete(state, batch)) {
      const sortedFutures: Future[] = sortFuturesByNonces(batch, state);

      const results = await this._submitOrCheckFutures(sortedFutures, state);

      batchResults = [...batchResults, ...results];

      if (this._isBatchComplete(state, sortedFutures)) {
        break;
      }

      const timeoutResults = await this._newBlockOrTimeout(
        state,
        sortedFutures
      );

      batchResults = [...timeoutResults, ...results];
    }

    return batchResults;
  }

  private async _submitOrCheckFutures(
    futures: Future[],
    state: ExecutionEngineState
  ): Promise<ExecutionResultMessage[]> {
    const accumulatedResults: ExecutionResultMessage[] = [];

    for (const future of futures) {
      if (this._isFutureComplete(future, state.executionStateMap)) {
        continue;
      }

      const result = await this._processFutureTick(future, state);

      // if the current future has a pending transaction,
      // continue with the batch
      if (result === null) {
        continue;
      }

      accumulatedResults.push(result);
    }

    return accumulatedResults;
  }

  /**
   * Wait for the next block to  be processed on-chain, monitoring transactions
   * for timeout at the same time. If timing out transactions complete
   * the batch we return before the next block.
   */
  private async _newBlockOrTimeout(
    state: ExecutionEngineState,
    futures: Future[]
  ): Promise<ExecutionTimeout[]> {
    const timeoutResults: ExecutionTimeout[] = [];

    while (true) {
      const currentBlock = await state.chainDispatcher.getCurrentBlock();

      if (
        currentBlock.number > state.block.number ||
        currentBlock.hash !== state.block.hash
      ) {
        state.block = currentBlock;

        return timeoutResults;
      }

      const timedOutTransactions =
        state.transactionLookupTimer.getTimedOutTransactions();

      for (const { futureId, executionId, txHash } of timedOutTransactions) {
        const timedOut: ExecutionTimeout = {
          type: "execution-timeout",
          futureId,
          executionId,
          txHash,
        };

        timeoutResults.push(timedOut);

        await this._apply(state, timedOut);
      }

      if (this._isBatchComplete(state, futures)) {
        return timeoutResults;
      }

      await sleep(state.config.blockPollingInterval);
    }
  }

  private async _processFutureTick(
    future: Future,
    state: ExecutionEngineState
  ): Promise<ExecutionResultMessage | null> {
    const { lastMessage, strategyInst } = await this._fastForwardToLastMessage(
      future,
      state
    );

    if (lastMessage !== null && isExecutionResultMessage(lastMessage)) {
      return lastMessage;
    }

    let next: TransactionMessage | null = lastMessage;

    while (true) {
      const onchainState = state.executionStateMap[future.id].onchain;

      assertIgnitionInvariant(
        onchainState !== undefined,
        "onchain state needed for each tick"
      );

      const response = await onchainStateTransitions[onchainState.status](
        state,
        next,
        strategyInst
      );

      if (response.status === "pause") {
        return null;
      }

      await this._apply(state, response.next);

      if (isExecutionResultMessage(response.next)) {
        return response.next;
      }

      next = response.next;
    }
  }

  private async _fastForwardToLastMessage(
    future: Future,
    state: ExecutionEngineState
  ) {
    const exState = state.executionStateMap[future.id];
    assertIgnitionInvariant(
      exState !== undefined,
      "Execution state should be defined"
    );

    const context = this._setupExecutionStrategyContext(future, state);
    const strategy = state.strategy.executeStrategy(context);

    return ExecutionStategyCycler.fastForward(exState, strategy);
  }

  private _isBatchComplete(
    state: ExecutionEngineState,
    sortedFutures: Future[]
  ): boolean {
    return sortedFutures.every((f) => {
      return this._isFutureComplete(f, state.executionStateMap);
    });
  }

  private _isFutureComplete(
    future: Future,
    executionStateMap: ExecutionStateMap
  ) {
    const state = executionStateMap[future.id];

    return (
      state !== undefined &&
      (state.status === ExecutionStatus.HOLD ||
        state.status === ExecutionStatus.TIMEOUT ||
        state.status === ExecutionStatus.SUCCESS ||
        state.status === ExecutionStatus.FAILED)
    );
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
          libraries: this._resolveLibraries(future.libraries, {
            executionStateMap,
          }),
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
          libraries: this._resolveLibraries(future.libraries, {
            executionStateMap,
          }),
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
          libraries: this._resolveLibraries(future.libraries, {
            executionStateMap,
          }),
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
          libraries: this._resolveLibraries(future.libraries, {
            executionStateMap,
          }),
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
          dependencies: [...future.dependencies].map((f) => f.id),
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
   * Resolve the libraries to their deployed addresses.
   */
  private _resolveLibraries(
    libraries: Record<string, ContractFuture<string>>,
    { executionStateMap }: { executionStateMap: ExecutionStateMap }
  ) {
    return Object.fromEntries(
      Object.entries(libraries).map(([key, lib]) => [
        key,
        resolveContractFutureToAddress(lib, { executionStateMap }),
      ])
    );
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

    const futureContext = {
      executionState: exState,
      sender,
    };

    return futureContext;
  }

  private _isMorePendingThanPreviousRunIndicates(
    pending: number,
    inflight: InflightTransaction[]
  ): boolean {
    const maxNonceTran = maxBy(inflight, "nonce");

    assertIgnitionInvariant(
      maxNonceTran !== undefined,
      "Always at least one entry going into maxBy"
    );

    return maxNonceTran.nonce + 1 < pending;
  }

  private _isIgnitionTranReplacedByConfirmedInterferingTran(
    inflightTran: InflightTransaction,
    latest: number
  ): boolean {
    return latest >= inflightTran.nonce + 1;
  }

  private _isIgnitionTranReplacedByPendingInterferingTran(
    inflightTran: InflightTransaction,
    latest: number,
    pending: number
  ) {
    return latest < inflightTran.nonce + 1 && pending >= inflightTran.nonce + 1;
  }

  private _inflightTranDroppedWithoutInterference(
    inflightTran: InflightTransaction,
    latest: number,
    pending: number
  ) {
    return latest < inflightTran.nonce + 1 && pending < inflightTran.nonce + 1;
  }
}
