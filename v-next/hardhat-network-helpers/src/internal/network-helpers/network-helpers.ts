import type {
  BlockTag,
  Fixture,
  NetworkHelpers as NetworkHelpersI,
  NumberLike,
  SnapshotRestorer,
} from "../../types.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

// Import all helper functions
import { dropTransaction } from "./helpers/drop-transaction.js";
import { getStorageAt } from "./helpers/get-storage-at.js";
import { impersonateAccount } from "./helpers/impersonate-account.js";
import { clearSnapshots, loadFixture } from "./helpers/load-fixture.js";
import { mineUpTo } from "./helpers/mine-up-to.js";
import { mine } from "./helpers/mine.js";
import { reset } from "./helpers/reset.js";
import { setBalance } from "./helpers/set-balance.js";
import { setBlockGasLimit } from "./helpers/set-block-gas-limit.js";
import { setCode } from "./helpers/set-code.js";
import { setCoinbase } from "./helpers/set-coinbase.js";
import { setNextBlockBaseFeePerGas } from "./helpers/set-next-block-base-fee-per-gas.js";
import { setNonce } from "./helpers/set-nonce.js";
import { setPrevRandao } from "./helpers/set-prev-randao.js";
import { setStorageAt } from "./helpers/set-storage-at.js";
import { stopImpersonatingAccount } from "./helpers/stop-impersonating-account.js";
import { takeSnapshot } from "./helpers/take-snapshot.js";
import { Time } from "./time/time.js";

export class NetworkHelpers implements NetworkHelpersI {
  readonly #provider: EthereumProvider;
  public time: Time;

  constructor(provider: EthereumProvider) {
    this.#provider = provider;
    this.time = new Time(this, provider);
  }

  public clearSnapshots(): void {
    clearSnapshots();
  }

  public dropTransaction(txHash: string): Promise<boolean> {
    return dropTransaction(this.#provider, txHash);
  }

  public getStorageAt(
    address: string,
    index: NumberLike,
    block: NumberLike | BlockTag = "latest",
  ): Promise<string> {
    return getStorageAt(this.#provider, address, index, block);
  }

  public impersonateAccount(address: string): Promise<void> {
    return impersonateAccount(this.#provider, address);
  }

  public loadFixture<T>(fixture: Fixture<T>): Promise<T> {
    return loadFixture(this, fixture);
  }

  public mine(
    blocks: NumberLike = 1,
    options: { interval?: NumberLike } = { interval: 1 },
  ): Promise<void> {
    return mine(this.#provider, blocks, options);
  }

  public mineUpTo(blockNumber: NumberLike): Promise<void> {
    return mineUpTo(this.#provider, blockNumber, this.time);
  }

  public reset(url?: string, blockNumber?: NumberLike): Promise<void> {
    return reset(this, this.#provider, url, blockNumber);
  }

  public setBalance(address: string, balance: NumberLike): Promise<void> {
    return setBalance(this.#provider, address, balance);
  }

  public setBlockGasLimit(blockGasLimit: NumberLike): Promise<void> {
    return setBlockGasLimit(this.#provider, blockGasLimit);
  }

  public setCode(address: string, code: string): Promise<void> {
    return setCode(this.#provider, address, code);
  }

  public setCoinbase(address: string): Promise<void> {
    return setCoinbase(this.#provider, address);
  }

  public setNextBlockBaseFeePerGas(baseFeePerGas: NumberLike): Promise<void> {
    return setNextBlockBaseFeePerGas(this.#provider, baseFeePerGas);
  }

  public setNonce(address: string, nonce: NumberLike): Promise<void> {
    return setNonce(this.#provider, address, nonce);
  }

  public setPrevRandao(prevRandao: NumberLike): Promise<void> {
    return setPrevRandao(this.#provider, prevRandao);
  }

  public setStorageAt(
    address: string,
    index: NumberLike,
    value: NumberLike,
  ): Promise<void> {
    return setStorageAt(this.#provider, address, index, value);
  }

  public stopImpersonatingAccount(address: string): Promise<void> {
    return stopImpersonatingAccount(this.#provider, address);
  }

  public takeSnapshot(): Promise<SnapshotRestorer> {
    return takeSnapshot(this.#provider);
  }
}
