import type {
  ChainType,
  DefaultChainType,
  NetworkConnection,
} from "hardhat/types/network";

export interface NetworkHelpers<
  ChainTypeT extends ChainType | string = DefaultChainType,
> {
  readonly time: Time<ChainTypeT>;

  /**
   * Clears every existing snapshot.
   *
   * @example
   * // Clear all saved snapshots
   * clearSnapshots();
   */
  clearSnapshots(): void;

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
  dropTransaction(txHash: string): Promise<boolean>;

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
  getStorageAt(
    address: string,
    index: NumberLike,
    block?: NumberLike | BlockTag,
  ): Promise<string>;

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
  impersonateAccount(address: string): Promise<void>;

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
  loadFixture<T>(fixture: Fixture<T, ChainTypeT>): Promise<T>;

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
  mine(blocks?: NumberLike, options?: { interval?: NumberLike }): Promise<void>;

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
  mineUpTo(blockNumber: NumberLike): Promise<void>;

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
  setBalance(address: string, balance: NumberLike): Promise<void>;

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
  setBlockGasLimit(blockGasLimit: NumberLike): Promise<void>;

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
  setCode(address: string, code: string): Promise<void>;

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
  setCoinbase(address: string): Promise<void>;

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
  setNextBlockBaseFeePerGas(baseFeePerGas: NumberLike): Promise<void>;

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
  setNonce(address: string, nonce: NumberLike): Promise<void>;

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
  setPrevRandao(prevRandao: NumberLike): Promise<void>;

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
  setStorageAt(
    address: string,
    index: NumberLike,
    value: NumberLike,
  ): Promise<void>;

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
  stopImpersonatingAccount(address: string): Promise<void>;

  /**
   * Takes a snapshot of the blockchain state at the current block.
   * @returns A promise that resolves to a `SnapshotRestorer` object, which contains a `restore` method to reset the network to this snapshot.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const snapshot = await networkHelpers.takeSnapshot();
   * await snapshot.restore(); // Restores the blockchain state
   */
  takeSnapshot(): Promise<SnapshotRestorer>;
}

export interface Time<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ChainTypeT is used in the class implementing the interface
  ChainTypeT extends ChainType | string = DefaultChainType,
> {
  readonly duration: Duration;

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
  increase(amountInSeconds: NumberLike): Promise<number>;

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
  increaseTo(timestamp: NumberLike | Date): Promise<void>;

  /**
   * Returns the timestamp of the latest block.
   *
   * @return The timestamp of the latest block.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const timestamp = await networkHelpers.time.latest();
   */
  latest(): Promise<number>;

  /**
   * Retrieves the latest block number.
   *
   * @returns A promise that resolves to the latest block number.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const blockNumber = await networkHelpers.time.latestBlock();
   */
  latestBlock(): Promise<number>;

  /**
   * Sets the timestamp of the next block but doesn't mine one.
   *
   * @param timestamp Can be `Date` or Epoch seconds. Must be greater than the latest block's timestamp.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * networkHelpers.time.setNextBlockTimestamp(1700000000);
   */
  setNextBlockTimestamp(timestamp: NumberLike | Date): Promise<void>;
}
export interface Duration {
  /**
   * Converts the given number of years into seconds.
   *
   * @param n - The number of years.
   * @returns The equivalent duration in seconds.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const seconds = networkHelpers.time.duration.years(1);
   */
  years(n: number): number;

  /**
   * Converts the given number of weeks into seconds.
   *
   * @param n - The number of weeks.
   * @returns The equivalent duration in seconds.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const seconds = networkHelpers.time.duration.weeks(1);
   */
  weeks(n: number): number;

  /**
   * Converts the given number of days into seconds.
   *
   * @param n - The number of days.
   * @returns The equivalent duration in seconds.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const seconds = networkHelpers.time.duration.days(1);
   */
  days(n: number): number;

  /**
   * Converts the given number of hours into seconds.
   *
   * @param n - The number of hours.
   * @returns The equivalent duration in seconds.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const seconds = networkHelpers.time.duration.hours(1);
   */
  hours(n: number): number;

  /**
   * Converts the given number of minutes into seconds.
   *
   * @param n - The number of minutes.
   * @returns The equivalent duration in seconds.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const seconds = networkHelpers.time.duration.minutes(1);
   */
  minutes(n: number): number;

  /**
   * Returns the number of seconds.
   *
   * @param n - The number of seconds.
   * @returns The same number of seconds.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const seconds = networkHelpers.time.duration.seconds(1);
   */
  seconds(n: number): number;

  /**
   * Converts the given number of milliseconds into seconds, rounded down to the nearest whole number.
   *
   * @param n - The number of milliseconds.
   * @returns The equivalent duration in seconds.
   *
   * @example
   * const { networkHelpers } = await hre.network.connect();
   * const seconds = networkHelpers.time.duration.millis(1500); // Returns 1
   */
  millis(n: number): number;
}

export type NumberLike = number | bigint | string;

export type BlockTag = "latest" | "earliest" | "pending";

export type Fixture<T, ChainTypeT extends ChainType | string> = (
  connection: NetworkConnection<ChainTypeT>,
) => Promise<T>;

export interface SnapshotRestorer {
  /**
   * Resets the state of the blockchain to the point in which the snapshot was
   * taken.
   */
  restore(): Promise<void>;
  snapshotId: string;
}

export interface Snapshot<T, ChainTypeT extends ChainType | string> {
  restorer: SnapshotRestorer;
  fixture: Fixture<T, ChainTypeT>;
  data: T;
}
