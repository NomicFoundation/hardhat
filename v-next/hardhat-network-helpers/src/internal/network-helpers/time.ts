import type { NetworkHelpers } from "./network-helpers.js";
import type { NumberLike } from "../../types.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

import { toBigInt, toRpcQuantity } from "../conversion.js";

import { Duration } from "./duration.js";

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
    const normalizedAmount = await toBigInt(amountInSeconds);

    const latestTimestamp = await toBigInt(await this.latest());

    const targetTimestamp = latestTimestamp + normalizedAmount;

    await this.#provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [toRpcQuantity(targetTimestamp)],
    });

    await this.#networkHelpers.mine();

    return this.latest();
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
    const normalizedTimestamp = await toBigInt(
      timestamp instanceof Date
        ? this.duration.millis(timestamp.valueOf())
        : timestamp,
    );

    await this.#provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [toRpcQuantity(normalizedTimestamp)],
    });

    await this.#networkHelpers.mine();
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
    const latestBlock = await this.#provider.request({
      method: "eth_getBlockByNumber",
      params: ["latest", false],
    });

    assertHardhatInvariant(
      typeof latestBlock === "object" &&
        latestBlock !== null &&
        "timestamp" in latestBlock &&
        typeof latestBlock.timestamp === "string",
      "latestBlock should have a timestamp",
    );

    return parseInt(latestBlock.timestamp, 16);
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
    const height = await this.#provider.request({
      method: "eth_blockNumber",
      params: [],
    });

    assertHardhatInvariant(
      typeof height === "string",
      "height should be a string",
    );

    return parseInt(height, 16);
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
    const timestampRpc = toRpcQuantity(
      timestamp instanceof Date
        ? this.duration.millis(timestamp.valueOf())
        : timestamp,
    );

    await this.#provider.request({
      method: "evm_setNextBlockTimestamp",
      params: [timestampRpc],
    });
  }
}
