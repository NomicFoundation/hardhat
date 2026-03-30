import type { JsonRpcClient } from "../jsonrpc-client.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

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

    if (expectedNonce !== pendingCount) {
      throw new HardhatError(
        HardhatError.ERRORS.IGNITION.EXECUTION.INVALID_NONCE,
        {
          sender,
          expectedNonce,
          pendingCount,
        },
      );
    }

    // The nonce hasn't been used yet, but we update as
    // it will be immediately used.
    this._maxUsedNonce[sender] = expectedNonce;

    return expectedNonce;
  }

  public revertNonce(sender: string): void {
    this._maxUsedNonce[sender] -= 1;
  }
}
