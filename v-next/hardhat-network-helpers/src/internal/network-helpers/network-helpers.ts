import type { BlockTag, NumberLike, SnapshotRestorer } from "../../types.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@ignored/hardhat-vnext-errors";

import { clearSnapshots } from "../../load-fixture.js";
import {
  assertHexString,
  assertLargerThan,
  assertTxHash,
  assertValidAddress,
} from "../assertions.js";
import { toBigInt, toNumber, toRpcQuantity } from "../conversion.js";
import { toPaddedRpcQuantity } from "../padding.js";

import { Time } from "./time.js";

export class NetworkHelpers {
  readonly #provider: EthereumProvider;

  public time: Time;

  constructor(provider: EthereumProvider) {
    this.#provider = provider;

    this.time = new Time(this, provider);
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
  public async dropTransaction(txHash: string): Promise<boolean> {
    assertTxHash(txHash);

    const success = await this.#provider.request({
      method: "hardhat_dropTransaction",
      params: [txHash],
    });

    assertHardhatInvariant(
      success === true || success === false,
      "The value should be either true or false",
    );

    return success;
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
  public async getStorageAt(
    address: string,
    index: NumberLike,
    block: NumberLike | BlockTag = "latest",
  ): Promise<string> {
    await assertValidAddress(address);

    const indexParam = toPaddedRpcQuantity(index, 32);

    const blockParam =
      block === "latest" || block === "earliest" || block === "pending"
        ? block
        : toRpcQuantity(block);

    const data = await this.#provider.request({
      method: "eth_getStorageAt",
      params: [address, indexParam, blockParam],
    });

    assertHardhatInvariant(
      typeof data === "string",
      "Storage data should be a string",
    );

    return data;
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
  public async impersonateAccount(address: string): Promise<void> {
    await assertValidAddress(address);

    await this.#provider.request({
      method: "hardhat_impersonateAccount",
      params: [address],
    });
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
  public async mine(
    blocks: NumberLike = 1,
    options: { interval?: NumberLike } = { interval: 1 },
  ): Promise<void> {
    const interval = options.interval ?? 1;

    const blocksHex = toRpcQuantity(blocks);
    const intervalHex = toRpcQuantity(interval);

    await this.#provider.request({
      method: "hardhat_mine",
      params: [blocksHex, intervalHex],
    });
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
  public async mineUpTo(blockNumber: NumberLike): Promise<void> {
    const normalizedBlockNumber = await toBigInt(blockNumber);
    const latestHeight = await toBigInt(await this.time.latestBlock());

    assertLargerThan(normalizedBlockNumber, latestHeight);

    const blockParam = normalizedBlockNumber - latestHeight;

    await this.#provider.request({
      method: "hardhat_mine",
      params: [toRpcQuantity(blockParam)],
    });
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
  public async reset(url?: string, blockNumber?: NumberLike): Promise<void> {
    clearSnapshots();

    if (url === undefined) {
      await this.#provider.request({
        method: "hardhat_reset",
        params: [],
      });
    } else if (blockNumber === undefined) {
      await this.#provider.request({
        method: "hardhat_reset",
        params: [
          {
            forking: { jsonRpcUrl: url },
          },
        ],
      });
    } else {
      await this.#provider.request({
        method: "hardhat_reset",
        params: [
          {
            forking: {
              jsonRpcUrl: url,
              blockNumber: toNumber(blockNumber),
            },
          },
        ],
      });
    }
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
  public async setBalance(address: string, balance: NumberLike): Promise<void> {
    await assertValidAddress(address);

    const balanceHex = toRpcQuantity(balance);

    await this.#provider.request({
      method: "hardhat_setBalance",
      params: [address, balanceHex],
    });
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
  public async setBlockGasLimit(blockGasLimit: NumberLike): Promise<void> {
    const blockGasLimitHex = toRpcQuantity(blockGasLimit);

    await this.#provider.request({
      method: "evm_setBlockGasLimit",
      params: [blockGasLimitHex],
    });
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
  public async setCode(address: string, code: string): Promise<void> {
    await assertValidAddress(address);
    assertHexString(code);

    await this.#provider.request({
      method: "hardhat_setCode",
      params: [address, code],
    });
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
  public async setCoinbase(address: string): Promise<void> {
    await assertValidAddress(address);

    await this.#provider.request({
      method: "hardhat_setCoinbase",
      params: [address],
    });
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
  public async setNextBlockBaseFeePerGas(
    baseFeePerGas: NumberLike,
  ): Promise<void> {
    const baseFeePerGasHex = toRpcQuantity(baseFeePerGas);

    await this.#provider.request({
      method: "hardhat_setNextBlockBaseFeePerGas",
      params: [baseFeePerGasHex],
    });
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
  public async setNonce(address: string, nonce: NumberLike): Promise<void> {
    await assertValidAddress(address);
    const nonceHex = toRpcQuantity(nonce);

    await this.#provider.request({
      method: "hardhat_setNonce",
      params: [address, nonceHex],
    });
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
  public async setPrevRandao(prevRandao: NumberLike): Promise<void> {
    const paddedPrevRandao = toPaddedRpcQuantity(prevRandao, 32);

    await this.#provider.request({
      method: "hardhat_setPrevRandao",
      params: [paddedPrevRandao],
    });
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
  public async setStorageAt(
    address: string,
    index: NumberLike,
    value: NumberLike,
  ): Promise<void> {
    await assertValidAddress(address);

    const indexParam = toRpcQuantity(index);
    const codeParam = toPaddedRpcQuantity(value, 32);

    await this.#provider.request({
      method: "hardhat_setStorageAt",
      params: [address, indexParam, codeParam],
    });
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
  public async stopImpersonatingAccount(address: string): Promise<void> {
    await assertValidAddress(address);

    await this.#provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [address],
    });
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
  public async takeSnapshot(): Promise<SnapshotRestorer> {
    let snapshotId = await this.#provider.request({
      method: "evm_snapshot",
    });

    if (typeof snapshotId !== "string") {
      throw new HardhatError(
        HardhatError.ERRORS.NETWORK_HELPERS.EVM_SNAPSHOT_VALUE_NOT_A_STRING,
      );
    }

    return {
      restore: async () => {
        const reverted = await this.#provider.request({
          method: "evm_revert",
          params: [snapshotId],
        });

        if (typeof reverted !== "boolean") {
          throw new HardhatError(
            HardhatError.ERRORS.NETWORK_HELPERS.EVM_REVERT_VALUE_NOT_A_BOOLEAN,
          );
        }

        if (!reverted) {
          throw new HardhatError(
            HardhatError.ERRORS.NETWORK_HELPERS.INVALID_SNAPSHOT,
          );
        }

        // Re-take the snapshot so that `restore` can be called again
        snapshotId = await this.#provider.request({
          method: "evm_snapshot",
        });
      },
      snapshotId,
    };
  }
}
