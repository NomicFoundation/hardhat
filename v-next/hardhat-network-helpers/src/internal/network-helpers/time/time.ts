import type { NumberLike } from "../../../types.js";
import type { NetworkHelpers } from "../network-helpers.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

import { Duration } from "../duration/duration.js";

import { increaseTo } from "./helpers/increase-to.js";
import { increase } from "./helpers/increase.js";
import { latestBlock } from "./helpers/latest-block.js";
import { latest } from "./helpers/latest.js";
import { setNextBlockTimestamp } from "./helpers/set-next-block-timestamp.js";

export class Time {
  readonly #networkHelpers: NetworkHelpers;
  readonly #provider: EthereumProvider;

  public readonly duration: Duration;

  constructor(networkHelpers: NetworkHelpers, provider: EthereumProvider) {
    this.#networkHelpers = networkHelpers;
    this.#provider = provider;

    this.duration = new Duration();
  }

  /**
   * Mines a new block whose timestamp is `amountInSeconds` after the latest block's timestamp.
   *
   * @param amountInSeconds Number of seconds to increase the next block's timestamp by.
   * @return The timestamp of the mined block.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * await networkHelpers.time.increase(12);
   */
  public async increase(amountInSeconds: NumberLike): Promise<number> {
    return increase(this.#provider, this.#networkHelpers, amountInSeconds);
  }

  /**
   * Mines a new block whose timestamp is `timestamp`.
   *
   * @param timestamp Can be `Date` or Epoch seconds. Must be greater than the latest block's timestamp.
   * @return A promise that resolves when the block is successfully mined.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * networkHelpers.time.increaseTo(1700000000);
   */
  public async increaseTo(timestamp: NumberLike | Date): Promise<void> {
    return increaseTo(
      this.#provider,
      this.#networkHelpers,
      timestamp,
      this.duration,
    );
  }

  /**
   * Returns the timestamp of the latest block.
   *
   * @return The timestamp of the latest block.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const timestamp = await networkHelpers.time.latest();
   */
  public async latest(): Promise<number> {
    return latest(this.#provider);
  }

  /**
   * Retrieves the latest block number.
   *
   * @returns A promise that resolves to the latest block number.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const blockNumber = await networkHelpers.time.latestBlock();
   */
  public async latestBlock(): Promise<number> {
    return latestBlock(this.#provider);
  }

  /**
   * Sets the timestamp of the next block but doesn't mine one.
   *
   * @param timestamp Can be `Date` or Epoch seconds. Must be greater than the latest block's timestamp.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * networkHelpers.time.setNextBlockTimestamp(1700000000);
   */
  public async setNextBlockTimestamp(
    timestamp: NumberLike | Date,
  ): Promise<void> {
    return setNextBlockTimestamp(this.#provider, timestamp, this.duration);
  }
}
