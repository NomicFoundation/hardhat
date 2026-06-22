import type * as NetworkHelpersModule from "./network-helpers.js";
import type {
  BlockTag,
  Fixture,
  NetworkHelpers as NetworkHelpersI,
  NumberLike,
  SnapshotRestorer,
  Time as TimeI,
} from "../../types.js";
import type { ChainType, NetworkConnection } from "hardhat/types/network";

import { bindAllMethods } from "@nomicfoundation/hardhat-utils/lang";

import { Duration } from "./duration/duration.js";

let NetworkHelpersImpl: typeof NetworkHelpersModule.NetworkHelpers | undefined;

export class LazyNetworkHelpers<ChainTypeT extends ChainType | string>
  implements NetworkHelpersI<ChainTypeT>
{
  readonly #connection: NetworkConnection<ChainTypeT>;
  #impl: NetworkHelpersModule.NetworkHelpers<ChainTypeT> | undefined;

  public readonly time: TimeI;

  constructor(connection: NetworkConnection<ChainTypeT>) {
    this.#connection = connection;
    this.time = new LazyTime<ChainTypeT>(() => this.#getImpl());
    bindAllMethods(this);
  }

  public clearSnapshots(): void {
    // No-op before the impl is constructed — there are no snapshots to clear.
    this.#impl?.clearSnapshots();
  }

  public async dropTransaction(txHash: string): Promise<boolean> {
    const impl = await this.#getImpl();
    return await impl.dropTransaction(txHash);
  }

  public async getStorageAt(
    address: string,
    index: NumberLike,
    block?: NumberLike | BlockTag,
  ): Promise<string> {
    const impl = await this.#getImpl();
    return await impl.getStorageAt(address, index, block);
  }

  public async impersonateAccount(address: string): Promise<void> {
    const impl = await this.#getImpl();
    return await impl.impersonateAccount(address);
  }

  public async loadFixture<T>(fixture: Fixture<T, ChainTypeT>): Promise<T> {
    const impl = await this.#getImpl();
    return await impl.loadFixture(fixture);
  }

  public async mine(
    blocks?: NumberLike,
    options?: { interval?: NumberLike },
  ): Promise<void> {
    const impl = await this.#getImpl();
    return await impl.mine(blocks, options);
  }

  public async mineUpTo(blockNumber: NumberLike): Promise<void> {
    const impl = await this.#getImpl();
    return await impl.mineUpTo(blockNumber);
  }

  public async setBalance(address: string, balance: NumberLike): Promise<void> {
    const impl = await this.#getImpl();
    return await impl.setBalance(address, balance);
  }

  public async setBlockGasLimit(blockGasLimit: NumberLike): Promise<void> {
    const impl = await this.#getImpl();
    return await impl.setBlockGasLimit(blockGasLimit);
  }

  public async setCode(address: string, code: string): Promise<void> {
    const impl = await this.#getImpl();
    return await impl.setCode(address, code);
  }

  public async setCoinbase(address: string): Promise<void> {
    const impl = await this.#getImpl();
    return await impl.setCoinbase(address);
  }

  public async setNextBlockBaseFeePerGas(
    baseFeePerGas: NumberLike,
  ): Promise<void> {
    const impl = await this.#getImpl();
    return await impl.setNextBlockBaseFeePerGas(baseFeePerGas);
  }

  public async setNonce(address: string, nonce: NumberLike): Promise<void> {
    const impl = await this.#getImpl();
    return await impl.setNonce(address, nonce);
  }

  public async setPrevRandao(prevRandao: NumberLike): Promise<void> {
    const impl = await this.#getImpl();
    return await impl.setPrevRandao(prevRandao);
  }

  public async setStorageAt(
    address: string,
    index: NumberLike,
    value: NumberLike,
  ): Promise<void> {
    const impl = await this.#getImpl();
    return await impl.setStorageAt(address, index, value);
  }

  public async stopImpersonatingAccount(address: string): Promise<void> {
    const impl = await this.#getImpl();
    return await impl.stopImpersonatingAccount(address);
  }

  public async takeSnapshot(): Promise<SnapshotRestorer> {
    const impl = await this.#getImpl();
    return await impl.takeSnapshot();
  }

  async #getImpl(): Promise<NetworkHelpersModule.NetworkHelpers<ChainTypeT>> {
    if (NetworkHelpersImpl === undefined) {
      ({ NetworkHelpers: NetworkHelpersImpl } = await import(
        "./network-helpers.js"
      ));
    }

    if (this.#impl === undefined) {
      this.#impl = new NetworkHelpersImpl(this.#connection);
    }

    return this.#impl;
  }
}

class LazyTime<ChainTypeT extends ChainType | string> implements TimeI {
  // Eager: `Duration` is pure math with no heavy imports, so instantiating it
  // up-front doesn't undermine the lazy-loading goal of this wrapper.
  public readonly duration: Duration = new Duration();
  readonly #getImpl: () => Promise<
    NetworkHelpersModule.NetworkHelpers<ChainTypeT>
  >;

  constructor(
    getImpl: () => Promise<NetworkHelpersModule.NetworkHelpers<ChainTypeT>>,
  ) {
    this.#getImpl = getImpl;
    bindAllMethods(this);
  }

  public async increase(amountInSeconds: NumberLike): Promise<number> {
    const impl = await this.#getImpl();
    return await impl.time.increase(amountInSeconds);
  }

  public async increaseTo(timestamp: NumberLike | Date): Promise<void> {
    const impl = await this.#getImpl();
    return await impl.time.increaseTo(timestamp);
  }

  public async latest(): Promise<number> {
    const impl = await this.#getImpl();
    return await impl.time.latest();
  }

  public async latestBlock(): Promise<number> {
    const impl = await this.#getImpl();
    return await impl.time.latestBlock();
  }

  public async setNextBlockTimestamp(
    timestamp: NumberLike | Date,
  ): Promise<void> {
    const impl = await this.#getImpl();
    return await impl.time.setNextBlockTimestamp(timestamp);
  }
}
