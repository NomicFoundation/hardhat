import type {
  BlockTag,
  Fixture,
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

export class NetworkHelpers {
  readonly #provider: EthereumProvider;
  public time: Time;

  constructor(provider: EthereumProvider) {
    this.#provider = provider;
    this.time = new Time(this, provider);
  }

  /**
   * Clears every existing snapshot.
   *
   * @example
   * // Clear all saved snapshots
   * clearSnapshots();
   */
  public clearSnapshots(): void {
    clearSnapshots();
  }

  /**
   * Removes the given transaction from the mempool, if it exists.
   *
   * @param txHash Transaction hash to be removed from the mempool.
   * @returns `true` if successful, otherwise `false`.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const success = await networkHelpers.dropTransaction('0x123...');
   */
  public dropTransaction(txHash: string): Promise<boolean> {
    return dropTransaction(this.#provider, txHash);
  }

  /**
   * Retrieves the data located at the given address, index, and block number.
   *
   * @param address The address to retrieve storage from.
   * @param index The position in storage.
   * @param block The block number, or one of "latest", "earliest", or "pending". Defaults to "latest".
   * @returns A promise that resolves to a string containing the hexadecimal code retrieved.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const storageData = await networkHelpers.getStorageAt("0x123...", 0);
   */
  public getStorageAt(
    address: string,
    index: NumberLike,
    block: NumberLike | BlockTag = "latest",
  ): Promise<string> {
    return getStorageAt(this.#provider, address, index, block);
  }

  /**
   * Allows Hardhat Network to sign transactions as the given address.
   *
   * @param address The address to impersonate.
   * @returns A promise that resolves once the account is impersonated.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * await networkHelpers.impersonateAccount("0x123...");
   */
  public impersonateAccount(address: string): Promise<void> {
    return impersonateAccount(this.#provider, address);
  }

  /**
   * Loads a fixture and restores the blockchain to a snapshot state for repeated tests.
   *
   * The `loadFixture` function is useful in tests where you need to set up the blockchain to a desired state
   * (like deploying contracts, minting tokens, etc.) and then run multiple tests based on that state.
   *
   * It executes the given fixture function, which should set up the blockchain state, and takes a snapshot of the blockchain.
   * On subsequent calls to `loadFixture` with the same fixture function, the blockchain is restored to that snapshot
   * rather than executing the fixture function again.
   *
   * ### Important:
   * **Do not pass anonymous functions** as the fixture function. Passing an anonymous function like
   * `loadFixture(async () => { ... })` will bypass the snapshot mechanism and result in the fixture being executed
   * each time. Instead, always pass a named function, like `loadFixture(deployTokens)`.
   *
   * @param fixture A named asynchronous function that sets up the desired blockchain state and returns the fixture's data.
   * @returns A promise that resolves to the data returned by the fixture, either from execution or a restored snapshot.
   *
   * @example
   * async function setupContracts() { ... }
   * const fixtureData = await loadFixture(setupContracts);
   */
  public loadFixture<T>(fixture: Fixture<T>): Promise<T> {
    return loadFixture(this, fixture);
  }

  /**
   * Mines a specified number of blocks with an optional time interval between them.
   *
   * @param blocks The number of blocks to mine. Defaults to 1 if not specified.
   * @param options.interval Configures the interval (in seconds) between the timestamps of each mined block. Defaults to 1.
   * @returns A promise that resolves once the blocks have been mined.
   *
   * @example
   * // Mine 1 block (default behavior)
   * const { networkHelpers } = await hre.network.connect();
   * await networkHelpers.mine();
   *
   * @example
   * // Mine 10 blocks with an interval of 60 seconds between each block
   * const { networkHelpers } = await hre.network.connect();
   * await networkHelpers.mine(10, { interval: 60 });
   */
  public mine(
    blocks: NumberLike = 1,
    options: { interval?: NumberLike } = { interval: 1 },
  ): Promise<void> {
    return mine(this.#provider, blocks, options);
  }

  /**
   * Mines new blocks until the latest block number reaches `blockNumber`.
   *
   * @param blockNumber Must be greater than the latest block's number.
   * @returns A promise that resolves once the required blocks have been mined.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * await networkHelpers.mineUpTo(150); // Mines until block with block number 150
   */
  public mineUpTo(blockNumber: NumberLike): Promise<void> {
    return mineUpTo(this.#provider, blockNumber, this.time);
  }

  /**
   * Resets the Hardhat Network to its initial state or forks from a given URL and block number.
   *
   * @param url Optional JSON-RPC URL to fork from.
   * @param blockNumber Optional block number to fork from.
   * @returns A promise that resolves once the reset operation is completed.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * await networkHelpers.reset(); // Resets the network
   * await networkHelpers.reset("https://mainnet.infura.io", 123456); // Resets and forks from a specific block
   */
  public reset(url?: string, blockNumber?: NumberLike): Promise<void> {
    return reset(this, this.#provider, url, blockNumber);
  }

  /**
   * Sets the balance for the given address.
   *
   * @param address The address whose balance will be updated.
   * @param balance The new balance to set for the given address, in wei.
   * @returns A promise that resolves once the balance has been set.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * await networkHelpers.setBalance("0x123...", 1000000000000000000n); // Sets 1 ETH
   */
  public setBalance(address: string, balance: NumberLike): Promise<void> {
    return setBalance(this.#provider, address, balance);
  }

  /**
   * Sets the gas limit for future blocks.
   *
   * @param blockGasLimit The gas limit to set for future blocks.
   * @returns A promise that resolves once the gas limit has been set.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * await networkHelpers.setBlockGasLimit(1000000); // Set block gas limit to 1,000,000
   */
  public setBlockGasLimit(blockGasLimit: NumberLike): Promise<void> {
    return setBlockGasLimit(this.#provider, blockGasLimit);
  }

  /**
   * Modifies the bytecode stored at an account's address.
   *
   * @param address The address where the given code should be stored.
   * @param code The code to store (as a hex string).
   * @returns A promise that resolves once the code is set.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * await networkHelpers.setCode("0x123...", "0x6001600101...");
   */
  public setCode(address: string, code: string): Promise<void> {
    return setCode(this.#provider, address, code);
  }

  /**
   * Sets the coinbase address to be used in new blocks.
   *
   * @param address The new coinbase address.
   * @returns A promise that resolves once the coinbase address has been set.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * await networkHelpers.setCoinbase("0x123...");
   */
  public setCoinbase(address: string): Promise<void> {
    return setCoinbase(this.#provider, address);
  }

  /**
   * Sets the base fee of the next block.
   *
   * @param baseFeePerGas The new base fee to use.
   * @returns A promise that resolves once the base fee is set.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * await networkHelpers.setNextBlockBaseFeePerGas(1000000); // Set base fee to 1,000,000
   */
  public setNextBlockBaseFeePerGas(baseFeePerGas: NumberLike): Promise<void> {
    return setNextBlockBaseFeePerGas(this.#provider, baseFeePerGas);
  }

  /**
   * Modifies an account's nonce by overwriting it.
   *
   * @param address The address whose nonce is to be changed.
   * @param nonce The new nonce.
   * @returns A promise that resolves once the nonce is set.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * await networkHelpers.setNonce("0x123...", 10); // Set the nonce of the account to 10
   */
  public setNonce(address: string, nonce: NumberLike): Promise<void> {
    return setNonce(this.#provider, address, nonce);
  }

  /**
   * Sets the PREVRANDAO value of the next block.
   *
   * @param prevRandao The new PREVRANDAO value to use.
   * @returns A promise that resolves once the PREVRANDAO value is set.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * await networkHelpers.setPrevRandao(123456789); // Set the PREVRANDAO value
   */
  public setPrevRandao(prevRandao: NumberLike): Promise<void> {
    return setPrevRandao(this.#provider, prevRandao);
  }

  /**
   * Writes a single position of an account's storage.
   *
   * @param address The address where the code should be stored.
   * @param index The index in storage.
   * @param value The value to store.
   * @returns A promise that resolves once the storage value is set.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * await networkHelpers.setStorageAt("0x123...", 0, 0x0000...);
   */
  public setStorageAt(
    address: string,
    index: NumberLike,
    value: NumberLike,
  ): Promise<void> {
    return setStorageAt(this.#provider, address, index, value);
  }

  /**
   * Stops Hardhat Network from impersonating the given address.
   *
   * @param address The address to stop impersonating.
   * @returns A promise that resolves once the impersonation is stopped.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * await networkHelpers.stopImpersonatingAccount("0x123...");
   */
  public stopImpersonatingAccount(address: string): Promise<void> {
    return stopImpersonatingAccount(this.#provider, address);
  }

  /**
   * Takes a snapshot of the blockchain state at the current block.
   * @returns A promise that resolves to a `SnapshotRestorer` object, which contains a `restore` method to reset the network to this snapshot.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const snapshot = await networkHelpers.takeSnapshot();
   * await snapshot.restore(); // Restores the blockchain state
   */
  public takeSnapshot(): Promise<SnapshotRestorer> {
    return takeSnapshot(this.#provider);
  }
}
