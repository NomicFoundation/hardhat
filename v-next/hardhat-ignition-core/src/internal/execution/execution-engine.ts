import type { Block, JsonRpcClient } from "./jsonrpc-client.js";
import type { DeploymentState } from "./types/deployment-state.js";
import type { ExecutionStrategy } from "./types/execution-strategy.js";
import type { ArtifactResolver } from "../../types/artifact.js";
import type { DeploymentParameters } from "../../types/deploy.js";
import type { ExecutionEventListener } from "../../types/execution-events.js";
import type {
  Future,
  IgnitionModule,
  IgnitionModuleResult,
} from "../../types/module.js";
import type { DeploymentLoader } from "../deployment-loader/types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import sortBy from "lodash-es/sortBy.js";

import { ExecutionEventType } from "../../types/execution-events.js";
import { assertIgnitionInvariant } from "../utils/assertions.js";
import { getFuturesFromModule } from "../utils/get-futures-from-module.js";
import { getNetworkExecutionStates } from "../views/execution-state/get-network-execution-states.js";
import { getPendingNonceAndSender } from "../views/execution-state/get-pending-nonce-and-sender.js";
import { hasExecutionSucceeded } from "../views/has-execution-succeeded.js";
import { isBatchFinished } from "../views/is-batch-finished.js";

import { applyNewMessage } from "./deployment-state-helpers.js";
import { FutureProcessor } from "./future-processor/future-processor.js";
import { getMaxNonceUsedBySender } from "./nonce-management/get-max-nonce-used-by-sender.js";
import { getNonceSyncMessages } from "./nonce-management/get-nonce-sync-messages.js";
import { JsonRpcNonceManager } from "./nonce-management/json-rpc-nonce-manager.js";
import { TransactionTrackingTimer } from "./transaction-tracking-timer.js";
import { NetworkInteractionType } from "./types/network-interaction.js";

/**
 * This class is used to execute a module to completion, returning the new
 * deployment state.
 */
export class ExecutionEngine {
  constructor(
    private readonly _deploymentLoader: DeploymentLoader,
    private readonly _artifactResolver: ArtifactResolver,
    private readonly _executionStrategy: ExecutionStrategy,
    private readonly _jsonRpcClient: JsonRpcClient,
    private readonly _executionEventListener:
      | ExecutionEventListener
      | undefined,
    private readonly _requiredConfirmations: number,
    private readonly _millisecondBeforeBumpingFees: number,
    private readonly _maxFeeBumps: number,
    private readonly _blockPollingInterval: number,
    private readonly _disableFeeBumping: boolean,
    private readonly _maxRetries: number,
    private readonly _retryInterval: number,
  ) {}

  /**
   * Executes a module to completion, returning the new deployment state.
   *
   * This functions saves to the journal any created message, and stores
   * artifacts and successful deployment addresses in the deployment folder.
   *
   * @param deploymentState The existing deployment state.
   * @param module The module to execute.
   * @param batches The result of batching the futures of the module.
   * @param accounts The accounts to use for executing the module.
   * @param deploymentParameters The deployment parameters provided by the user.
   * @param defaultSender The default sender to use as `from` of futures, transactions and static calls.
   * @returns The new deployment state.
   */
  public async executeModule(
    deploymentState: DeploymentState,
    module: IgnitionModule<string, string, IgnitionModuleResult<string>>,
    batches: string[][],
    accounts: string[],
    deploymentParameters: DeploymentParameters,
    defaultSender: string,
  ): Promise<DeploymentState> {
    await this._checkForMissingTransactions(deploymentState);

    deploymentState = await this._syncNonces(
      deploymentState,
      module,
      accounts,
      defaultSender,
    );

    await this._executionStrategy.init(
      this._deploymentLoader,
      this._jsonRpcClient,
    );

    const transactionTrackingTimer = new TransactionTrackingTimer();

    const nonceManager = new JsonRpcNonceManager(
      this._jsonRpcClient,
      getMaxNonceUsedBySender(deploymentState),
    );

    const futureProcessor = new FutureProcessor(
      this._deploymentLoader,
      this._artifactResolver,
      this._executionStrategy,
      this._jsonRpcClient,
      transactionTrackingTimer,
      nonceManager,
      this._requiredConfirmations,
      this._millisecondBeforeBumpingFees,
      this._maxFeeBumps,
      accounts,
      deploymentParameters,
      defaultSender,
      this._disableFeeBumping,
      this._maxRetries,
      this._retryInterval,
    );

    const futures = getFuturesFromModule(module);

    for (const batch of batches) {
      await this._emitBeginNextBatchEvent();

      // TODO: consider changing batcher to return futures rather than ids
      const executionBatch = batch.map((futureId) =>
        this._lookupFuture(futures, futureId),
      );

      deploymentState = await this._executeBatch(
        futureProcessor,
        executionBatch,
        deploymentState,
      );

      if (
        !executionBatch.every((f) => hasExecutionSucceeded(f, deploymentState))
      ) {
        return deploymentState;
      }
    }

    return deploymentState;
  }

  /**
   * Executes a batch of futures until all of its futures are completed.
   *
   * @param futureProcessor The FutureProcessor to use for executing the futures.
   * @param batch The batch of futures to execute.
   * @param deploymentState The current deployment state.
   * @returns The new deployment state.
   */
  private async _executeBatch(
    futureProcessor: FutureProcessor,
    batch: Future[],
    deploymentState: DeploymentState,
  ): Promise<DeploymentState> {
    // TODO: Do we really need to sort them here?
    const sortedFutures: Future[] = this._getBatchSortedByHighestPendingNonce(
      batch,
      deploymentState,
    );

    let block = await this._jsonRpcClient.getLatestBlock();

    while (true) {
      for (const future of sortedFutures) {
        const { newState } = await futureProcessor.processFuture(
          future,
          deploymentState,
        );

        deploymentState = newState;
      }

      if (
        isBatchFinished(
          deploymentState,
          sortedFutures.map((f) => f.id),
        )
      ) {
        break;
      }

      block = await this._waitForNextBlock(block);
    }

    return deploymentState;
  }

  /**
   * Returns a promise that only resolves when the next block is available,
   * and returns it.
   *
   * This function polls the network every `_blockPollingInterval` milliseconds.
   *
   * @param previousBlock The previous block that we know of, to compare from
   *  the one we get grom the network.
   * @returns The new block.
   */
  private async _waitForNextBlock(previousBlock: Block): Promise<Block> {
    while (true) {
      await new Promise((resolve) =>
        setTimeout(resolve, this._blockPollingInterval),
      );

      const newBlock = await this._jsonRpcClient.getLatestBlock();
      if (newBlock.number > previousBlock.number) {
        return newBlock;
      }
    }
  }

  /**
   * Checks the journal for missing transactions, throws if any are found
   * and asks the user to track the missing transaction via the `track-tx` command.
   */
  private async _checkForMissingTransactions(
    deploymentState: DeploymentState,
  ): Promise<void> {
    const exStates = getNetworkExecutionStates(deploymentState);

    for (const exState of exStates) {
      for (const ni of exState.networkInteractions) {
        if (
          ni.type === NetworkInteractionType.ONCHAIN_INTERACTION &&
          ni.nonce !== undefined &&
          ni.transactions.length === 0
        ) {
          throw new HardhatError(
            HardhatError.ERRORS.IGNITION.EXECUTION.TRANSACTION_LOST,
            {
              futureId: exState.id,
              nonce: ni.nonce,
              sender: exState.from,
            },
          );
        }
      }
    }
  }

  /**
   * Syncs the nonces of the deployment state with the blockchain, returning
   * the new deployment state, and throwing if they can't be synced.
   *
   * This method processes dropped and replaced transactions.
   *
   * @param deploymentState The existing deployment state.
   * @param ignitionModule The module that will be executed.
   * @returns The updated deployment state.
   */
  private async _syncNonces(
    deploymentState: DeploymentState,
    ignitionModule: IgnitionModule<
      string,
      string,
      IgnitionModuleResult<string>
    >,
    accounts: string[],
    defaultSender: string,
  ): Promise<DeploymentState> {
    const nonceSyncMessages = await getNonceSyncMessages(
      this._jsonRpcClient,
      deploymentState,
      ignitionModule,
      accounts,
      defaultSender,
      this._requiredConfirmations,
    );

    for (const message of nonceSyncMessages) {
      deploymentState = await applyNewMessage(
        message,
        deploymentState,
        this._deploymentLoader,
      );
    }

    return deploymentState;
  }

  /**
   * Returns a future by its id.
   */
  private _lookupFuture(futures: Future[], futureId: string): Future {
    const future = futures.find((f) => f.id === futureId);

    assertIgnitionInvariant(
      future !== undefined,
      `Future ${futureId} not found`,
    );

    return future;
  }

  /**
   * Returns the batch sorted by the highest the pending nonce of each future
   * and sender.
   *
   * Futures without any pending nonce come last.
   */
  private _getBatchSortedByHighestPendingNonce(
    batch: Future[],
    deploymentState: DeploymentState,
  ): Future[] {
    const batchWithNonces = batch.map((f) => {
      const NO_PENDING_RESULT = {
        future: f,
        nonce: Number.MAX_SAFE_INTEGER,
        from: "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
      };

      const exState = deploymentState.executionStates[f.id];

      if (exState === undefined) {
        return NO_PENDING_RESULT;
      }

      const pendingNonceAndSender = getPendingNonceAndSender(exState);

      if (pendingNonceAndSender === undefined) {
        return NO_PENDING_RESULT;
      }

      return {
        future: f,
        nonce: pendingNonceAndSender.nonce,
        from: pendingNonceAndSender.sender,
      };
    });

    const sortedBatch = sortBy(batchWithNonces, ["from", "nonce", "future.id"]);

    return sortedBatch.map((f) => f.future);
  }

  /**
   * Emits an execution event signaling that execution of the next batch has begun.
   */
  private async _emitBeginNextBatchEvent(): Promise<void> {
    if (this._executionEventListener !== undefined) {
      await this._executionEventListener.beginNextBatch({
        type: ExecutionEventType.BEGIN_NEXT_BATCH,
      });
    }
  }
}
