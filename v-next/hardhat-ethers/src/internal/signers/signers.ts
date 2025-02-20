import type { HardhatEthersSigner as HardhatEthersSignerI } from "../../types.js";
import type { HardhatEthersProvider } from "../hardhat-ethers-provider/hardhat-ethers-provider.js";
import type { NetworkConfig } from "hardhat/types/config";
import type { BlockTag, TransactionRequest, ethers } from "ethers";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertArgument,
  getAddress,
  hexlify,
  resolveAddress,
  toUtf8Bytes,
  TypedDataEncoder,
} from "ethers";

import { getRpcTransaction } from "../ethers-utils/ethers-utils.js";

import { deepCopy } from "./deep-copy.js";
import { populate } from "./populate.js";

export class HardhatEthersSigner implements HardhatEthersSignerI {
  readonly #gasLimit: bigint | undefined;

  public readonly address: string;
  public readonly provider: ethers.JsonRpcProvider | HardhatEthersProvider;
  public static networkName: string;
  public static networkConfig: NetworkConfig;

  public static async create(
    provider: HardhatEthersProvider,
    networkName: string,
    networkConfig: NetworkConfig,
    address: string,
  ): Promise<HardhatEthersSigner> {
    this.networkName = networkName;
    this.networkConfig = networkConfig;

    let gasLimit: bigint | undefined;

    if (networkConfig.gas !== "auto") {
      gasLimit = networkConfig.gas;
    }

    return new HardhatEthersSigner(address, provider, gasLimit);
  }

  private constructor(
    address: string,
    provider: ethers.JsonRpcProvider | HardhatEthersProvider,
    gasLimit?: bigint | undefined,
  ) {
    this.address = getAddress(address);
    this.provider = provider;
    this.#gasLimit = gasLimit;
  }

  public connect(
    provider: ethers.JsonRpcProvider | HardhatEthersProvider,
  ): ethers.Signer {
    return new HardhatEthersSigner(this.address, provider);
  }

  public getNonce(blockTag?: BlockTag | undefined): Promise<number> {
    return this.provider.getTransactionCount(this.address, blockTag);
  }

  public populateCall(
    tx: TransactionRequest,
  ): Promise<ethers.TransactionLike<string>> {
    return populate(this, tx);
  }

  public populateTransaction(
    tx: TransactionRequest,
  ): Promise<ethers.TransactionLike<string>> {
    return this.populateCall(tx);
  }

  public async estimateGas(tx: TransactionRequest): Promise<bigint> {
    return this.provider.estimateGas(await this.populateCall(tx));
  }

  public async call(tx: TransactionRequest): Promise<string> {
    return this.provider.call(await this.populateCall(tx));
  }

  public resolveName(name: string): Promise<string | null> {
    return this.provider.resolveName(name);
  }

  public async signTransaction(_tx: TransactionRequest): Promise<string> {
    // TODO if we split the signer for the in-process and json-rpc networks,
    // we can enable this method when using the in-process network or when the
    // json-rpc network has a private key
    throw new HardhatError(HardhatError.ERRORS.ETHERS.METHOD_NOT_IMPLEMENTED, {
      method: "HardhatEthersSigner.signTransaction",
    });
  }

  public async sendTransaction(
    tx: TransactionRequest,
  ): Promise<ethers.TransactionResponse> {
    // This cannot be mined any earlier than any recent block

    const blockNumber = await this.provider.getBlockNumber();

    // Send the transaction
    const hash = await this.#sendUncheckedTransaction(tx);

    // Unfortunately, JSON-RPC only provides and opaque transaction hash
    // for a response, and we need the actual transaction, so we poll
    // for it; it should show up very quickly

    return new Promise((resolve) => {
      const timeouts = [1000, 100];
      const checkTx = async () => {
        // Try getting the transaction
        const txPolled = await this.provider.getTransaction(hash);
        if (txPolled !== null) {
          resolve(txPolled.replaceableTransaction(blockNumber));
          return;
        }

        // Wait another 4 seconds
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises -- this check must be done in an async way
          checkTx();
        }, timeouts.pop() ?? 4000);
      };

      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- this check must be done in an async way
      checkTx();
    });
  }

  public signMessage(message: string | Uint8Array): Promise<string> {
    const resolvedMessage =
      typeof message === "string" ? toUtf8Bytes(message) : message;
    return this.provider.send("personal_sign", [
      hexlify(resolvedMessage),
      this.address.toLowerCase(),
    ]);
  }

  public async signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>,
  ): Promise<string> {
    const copiedValue = await deepCopy(value);

    // Populate any ENS names (in-place)
    const populated = await TypedDataEncoder.resolveNames(
      domain,
      types,
      copiedValue,
      async (v: string) => {
        return v;
      },
    );

    return this.provider.send("eth_signTypedData_v4", [
      this.address.toLowerCase(),
      JSON.stringify(
        TypedDataEncoder.getPayload(populated.domain, types, populated.value),
        (_k, v) => {
          if (typeof v === "bigint") {
            return v.toString();
          }

          return v;
        },
      ),
    ]);
  }

  public async getAddress(): Promise<string> {
    return this.address;
  }

  public toJSON() {
    return `<SignerWithAddress ${this.address}>`;
  }

  async #sendUncheckedTransaction(tx: TransactionRequest): Promise<string> {
    const resolvedTx = await deepCopy(tx);

    const promises: Array<Promise<void>> = [];

    // Make sure the from matches the sender
    if (resolvedTx.from !== null && resolvedTx.from !== undefined) {
      const _from = resolvedTx.from;
      promises.push(
        (async () => {
          const from = await resolveAddress(_from, this.provider);
          assertArgument(
            from !== null &&
              from !== undefined &&
              from.toLowerCase() === this.address.toLowerCase(),
            "from address mismatch",
            "transaction",
            tx,
          );
          resolvedTx.from = from;
        })(),
      );
    } else {
      resolvedTx.from = this.address;
    }

    if (resolvedTx.gasLimit === null || resolvedTx.gasLimit === undefined) {
      if (this.#gasLimit !== undefined) {
        resolvedTx.gasLimit = this.#gasLimit;
      } else {
        promises.push(
          (async () => {
            resolvedTx.gasLimit = await this.provider.estimateGas({
              ...resolvedTx,
              from: this.address,
            });
          })(),
        );
      }
    }

    // The address may be an ENS name or Addressable
    if (resolvedTx.to !== null && resolvedTx.to !== undefined) {
      const _to = resolvedTx.to;
      promises.push(
        (async () => {
          resolvedTx.to = await resolveAddress(_to, this.provider);
        })(),
      );
    }

    // Wait until all of our properties are filled in
    if (promises.length > 0) {
      await Promise.all(promises);
    }

    const hexTx = getRpcTransaction(resolvedTx);

    return this.provider.send("eth_sendTransaction", [hexTx]);
  }
}

// exported as an alias to make migration easier
export { HardhatEthersSigner as SignerWithAddress };
