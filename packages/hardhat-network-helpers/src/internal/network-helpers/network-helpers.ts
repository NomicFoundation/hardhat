import type {
  BlockTag,
  Fixture,
  NetworkHelpers as NetworkHelpersI,
  NumberLike,
  Snapshot,
  SnapshotRestorer,
} from "../../types.js";
import type { ChainType, NetworkConnection } from "hardhat/types/network";
import type { EthereumProvider } from "hardhat/types/providers";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { bindAllMethods } from "@nomicfoundation/hardhat-utils/lang";

import { dropTransaction } from "./helpers/drop-transaction.js";
import { getStorageAt } from "./helpers/get-storage-at.js";
import { impersonateAccount } from "./helpers/impersonate-account.js";
import { loadFixture } from "./helpers/load-fixture.js";
import { mineUpTo } from "./helpers/mine-up-to.js";
import { mine } from "./helpers/mine.js";
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

const SUPPORTED_TEST_NETWORKS = ["hardhat", "zksync", "anvil"];

export class NetworkHelpers<ChainTypeT extends ChainType | string>
  implements NetworkHelpersI<ChainTypeT>
{
  readonly #connection: NetworkConnection<ChainTypeT>;
  readonly #provider: EthereumProvider;
  readonly #networkName: string;
  #snapshots: Array<Snapshot<any, ChainTypeT>> = [];

  #isDevelopmentNetwork: boolean | undefined;
  #version: string | undefined;

  public time: Time<ChainTypeT>;

  constructor(connection: NetworkConnection<ChainTypeT>) {
    this.#connection = connection;
    this.#provider = connection.provider;
    this.#networkName = connection.networkName;

    this.time = new Time(this, connection.provider);

    bindAllMethods(this);
  }

  public clearSnapshots(): void {
    this.#snapshots = [];
  }

  public async dropTransaction(txHash: string): Promise<boolean> {
    await this.throwIfNotDevelopmentNetwork();
    return dropTransaction(this.#provider, txHash);
  }

  public async getStorageAt(
    address: string,
    index: NumberLike,
    block: NumberLike | BlockTag = "latest",
  ): Promise<string> {
    await this.throwIfNotDevelopmentNetwork();
    return getStorageAt(this.#provider, address, index, block);
  }

  public async impersonateAccount(address: string): Promise<void> {
    await this.throwIfNotDevelopmentNetwork();
    return impersonateAccount(this.#provider, address);
  }

  public async loadFixture<T>(fixture: Fixture<T, ChainTypeT>): Promise<T> {
    await this.throwIfNotDevelopmentNetwork();

    const { snapshots, snapshotData } = await loadFixture(
      this,
      fixture,
      this.#snapshots,
      this.#connection,
    );

    this.#snapshots = snapshots;

    return snapshotData;
  }

  public async mine(
    blocks: NumberLike = 1,
    options: { interval?: NumberLike } = { interval: 1 },
  ): Promise<void> {
    await this.throwIfNotDevelopmentNetwork();
    return mine(this.#provider, blocks, options);
  }

  public async mineUpTo(blockNumber: NumberLike): Promise<void> {
    await this.throwIfNotDevelopmentNetwork();
    return mineUpTo(this.#provider, blockNumber, this.time);
  }

  public async setBalance(address: string, balance: NumberLike): Promise<void> {
    await this.throwIfNotDevelopmentNetwork();
    return setBalance(this.#provider, address, balance);
  }

  public async setBlockGasLimit(blockGasLimit: NumberLike): Promise<void> {
    await this.throwIfNotDevelopmentNetwork();
    return setBlockGasLimit(this.#provider, blockGasLimit);
  }

  public async setCode(address: string, code: string): Promise<void> {
    await this.throwIfNotDevelopmentNetwork();
    return setCode(this.#provider, address, code);
  }

  public async setCoinbase(address: string): Promise<void> {
    await this.throwIfNotDevelopmentNetwork();
    return setCoinbase(this.#provider, address);
  }

  public async setNextBlockBaseFeePerGas(
    baseFeePerGas: NumberLike,
  ): Promise<void> {
    await this.throwIfNotDevelopmentNetwork();
    return setNextBlockBaseFeePerGas(this.#provider, baseFeePerGas);
  }

  public async setNonce(address: string, nonce: NumberLike): Promise<void> {
    await this.throwIfNotDevelopmentNetwork();
    return setNonce(this.#provider, address, nonce);
  }

  public async setPrevRandao(prevRandao: NumberLike): Promise<void> {
    await this.throwIfNotDevelopmentNetwork();
    return setPrevRandao(this.#provider, prevRandao);
  }

  public async setStorageAt(
    address: string,
    index: NumberLike,
    value: NumberLike,
  ): Promise<void> {
    await this.throwIfNotDevelopmentNetwork();
    return setStorageAt(this.#provider, address, index, value);
  }

  public async stopImpersonatingAccount(address: string): Promise<void> {
    await this.throwIfNotDevelopmentNetwork();
    return stopImpersonatingAccount(this.#provider, address);
  }

  public async takeSnapshot(): Promise<SnapshotRestorer> {
    await this.throwIfNotDevelopmentNetwork();
    return takeSnapshot(this.#provider);
  }

  public async throwIfNotDevelopmentNetwork(): Promise<void> {
    if (this.#isDevelopmentNetwork === undefined) {
      const version = await this.#provider.request({
        method: "web3_clientVersion",
      });

      assertHardhatInvariant(
        typeof version === "string",
        `"version" should be a string`,
      );

      this.#version = version;

      this.#isDevelopmentNetwork = SUPPORTED_TEST_NETWORKS.some(
        (network) => this.#version?.toLowerCase().startsWith(network) === true,
      );
    }

    if (!this.#isDevelopmentNetwork) {
      if (this.#version !== undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.NETWORK_HELPERS.GENERAL.CAN_ONLY_BE_USED_WITH_HARDHAT_NETWORK_VERSIONED,
          {
            networkName: this.#networkName,
            version: this.#version,
          },
        );
      }

      throw new HardhatError(
        HardhatError.ERRORS.NETWORK_HELPERS.GENERAL.CAN_ONLY_BE_USED_WITH_HARDHAT_NETWORK,
        {
          networkName: this.#networkName,
        },
      );
    }
  }
}
