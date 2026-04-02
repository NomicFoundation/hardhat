import type { JsonRpcClient } from "../jsonrpc-client.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

/**
 * Fixed-interval retry delays (in ms) used when waiting for the node's
 * mempool to reflect recently submitted transactions. The first entry is
 * 0 so an immediate re-check is performed before any waiting. Subsequent
 * retries wait 50 ms each, up to a maximum total wait of 1 second.
 */
const MEMPOOL_SYNC_RETRY_DELAYS_MS = [
  0,
  ...Array.from({ length: 20 }, () => 50),
];

/**
 * This interface is meant to be used to fetch new nonces for transactions.
 */

export interface NonceManager {
  /**
   * Returns the next nonce for a given sender, throwing if its not the one
   * expected by the network.
   *
   * If a nonce is returned by this method it must be immediately used to
   * send a transaction. If it can't be used, Ignition's execution must be
   * interrupted.
   */
  getNextNonce(sender: string): Promise<number>;

  /**
   * Reverts the last nonce allocation for a given sender.
   *
   * This method is used when a nonce has been allocated,
   * but the transaction fails during simulation and is not sent.
   */
  revertNonce(sender: string): void;
}

/**
 * An implementation of NonceManager that validates the nonces using
 * the _maxUsedNonce params and a JsonRpcClient.
 */
export class JsonRpcNonceManager implements NonceManager {
  constructor(
    private readonly _jsonRpcClient: JsonRpcClient,
    private readonly _maxUsedNonce: { [sender: string]: number },
  ) {}

  public async getNextNonce(sender: string): Promise<number> {
    const pendingCount = await this._jsonRpcClient.getTransactionCount(
      sender,
      "pending",
    );

    const expectedNonce =
      this._maxUsedNonce[sender] !== undefined
        ? this._maxUsedNonce[sender] + 1
        : pendingCount;

    // Nonces are validated against the node's pending transaction count.
    // Because the node's mempool can lag behind transactions already
    // submitted by Ignition, a strict equality check would cause false
    // failures during normal operation. Instead we heuristically distinguish
    // three cases:
    //  - pendingCount === expectedNonce: states appear in sync — proceed
    //    normally.
    //  - pendingCount > expectedNonce: the node reports more pending
    //    transactions than Ignition expects for this account. This often
    //    happens when other transactions have been sent from the same
    //    account, but can also be caused by provider or node inconsistencies.
    //    We treat this as a hard error because Ignition cannot safely
    //    reconcile the discrepancy.
    //  - pendingCount < expectedNonce: the node may not have caught up with
    //    transactions Ignition believes should exist. We retry for a short,
    //    bounded period and surface an error if the gap persists, which may
    //    indicate a dropped transaction, provider lag, or another mismatch
    //    between Ignition's view and the node's state.
    if (pendingCount !== expectedNonce) {
      const resolvedCount =
        pendingCount < expectedNonce
          ? await this._waitForMempoolSync(sender, expectedNonce)
          : pendingCount;

      if (resolvedCount !== expectedNonce) {
        const errorDescriptor =
          resolvedCount > expectedNonce
            ? HardhatError.ERRORS.IGNITION.EXECUTION.NONCE_TOO_HIGH
            : HardhatError.ERRORS.IGNITION.EXECUTION.NONCE_TOO_LOW;

        throw new HardhatError(errorDescriptor, {
          sender,
          expectedNonce,
          pendingCount: resolvedCount,
        });
      }
    }

    // The nonce hasn't been used yet, but we update as
    // it will be immediately used.
    this._maxUsedNonce[sender] = expectedNonce;

    return expectedNonce;
  }

  public revertNonce(sender: string): void {
    this._maxUsedNonce[sender] -= 1;
  }

  /**
   * Retries the pending transaction count check with incremental backoff.
   * Returns the last observed count.
   */
  private async _waitForMempoolSync(
    sender: string,
    expectedNonce: number,
  ): Promise<number> {
    let pendingCount = 0;

    for (const delay of MEMPOOL_SYNC_RETRY_DELAYS_MS) {
      await new Promise((resolve) => setTimeout(resolve, delay));

      pendingCount = await this._jsonRpcClient.getTransactionCount(
        sender,
        "pending",
      );

      if (pendingCount >= expectedNonce) {
        break;
      }
    }

    return pendingCount;
  }
}
