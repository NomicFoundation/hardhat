import type { HardhatEthersProvider as HardhatEthersProviderI } from "../../types.js";
import type { NetworkConfig } from "hardhat/types/config";
import type { EthereumProvider } from "hardhat/types/providers";
import type {
  AddressLike,
  BlockTag,
  TransactionRequest,
  Filter,
  FilterByBlockHash,
  Listener,
  ProviderEvent,
  PerformActionTransaction,
  TransactionResponseParams,
  BlockParams,
  TransactionReceiptParams,
  LogParams,
  PerformActionFilter,
  EventFilter,
  ethers,
} from "ethers";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { numberToHexString } from "@nomicfoundation/hardhat-utils/hex";
import { deepEqual } from "@nomicfoundation/hardhat-utils/lang";
import debug from "debug";
import {
  Block,
  FeeData,
  Log,
  Network as EthersNetwork,
  Transaction,
  TransactionReceipt,
  TransactionResponse,
  getBigInt,
  isHexString,
  resolveAddress,
  toQuantity,
} from "ethers";

import { assertCanConvertToBigInt } from "../assertion.js";
import {
  copyRequest,
  formatBlock,
  formatLog,
  formatTransactionReceipt,
  formatTransactionResponse,
  getRpcTransaction,
} from "../ethers-utils/ethers-utils.js";
import { HardhatEthersSigner } from "../signers/signers.js";

const log = debug("hardhat:hardhat-ethers:provider");

interface ListenerItem {
  listener: Listener;
  once: boolean;
}

interface EventListenerItem {
  event: EventFilter;
  // map from the given listener to the block listener registered for that listener
  listenersMap: Map<Listener, Listener>;
}

// this type has a more explicit and type-safe list
// of the events that we support
type HardhatEthersProviderEvent =
  | {
      kind: "block";
    }
  | {
      kind: "transactionHash";
      txHash: string;
    }
  | {
      kind: "event";
      eventFilter: EventFilter;
    };

export class HardhatEthersProvider implements HardhatEthersProviderI {
  #isHardhatNetworkCached: boolean | undefined;

  readonly #hardhatProvider: EthereumProvider;
  readonly #networkName: string;
  readonly #networkConfig: Readonly<NetworkConfig>;

  // event-emitter related fields
  #latestBlockNumberPolled: number | undefined;
  #blockListeners: ListenerItem[] = [];
  #transactionHashListeners: Map<string, ListenerItem[]> = new Map();
  #eventListeners: EventListenerItem[] = [];

  #transactionHashPollingTimeout: NodeJS.Timeout | undefined;
  #blockPollingTimeout: NodeJS.Timeout | undefined;

  constructor(
    hardhatProvider: EthereumProvider,
    networkName: string,
    networkConfig: NetworkConfig,
  ) {
    this.#hardhatProvider = hardhatProvider;
    this.#networkName = networkName;
    this.#networkConfig = networkConfig;
  }

  public get provider(): this {
    return this;
  }

  public destroy(): void {}

  public async send(method: string, params?: any[]): Promise<any> {
    return this.#hardhatProvider.request({
      method,
      params,
    });
  }

  public async getSigner(
    address?: number | string,
  ): Promise<HardhatEthersSigner> {
    if (address === null || address === undefined) {
      address = 0;
    }

    const accountsPromise = this.send("eth_accounts", []);

    // Account index
    if (typeof address === "number") {
      const accounts: string[] = await accountsPromise;
      if (address >= accounts.length) {
        throw new HardhatError(
          HardhatError.ERRORS.ETHERS.ACCOUNT_INDEX_OUT_OF_RANGE,
          {
            accountIndex: address,
            accountsLength: accounts.length,
          },
        );
      }
      return HardhatEthersSigner.create(
        this,
        this.#networkName,
        this.#networkConfig,
        accounts[address],
      );
    }

    if (typeof address === "string") {
      return HardhatEthersSigner.create(
        this,
        this.#networkName,
        this.#networkConfig,
        address,
      );
    }

    throw new HardhatError(HardhatError.ERRORS.ETHERS.CANNOT_GET_ACCOUNT, {
      address,
    });
  }

  public async getBlockNumber(): Promise<number> {
    const blockNumber = await this.#hardhatProvider.request({
      method: "eth_blockNumber",
    });

    return Number(blockNumber);
  }

  public async getNetwork(): Promise<EthersNetwork> {
    const chainId = await this.#hardhatProvider.request({
      method: "eth_chainId",
    });

    return new EthersNetwork(this.#networkName, Number(chainId));
  }

  public async getFeeData(): Promise<ethers.FeeData> {
    let gasPrice: bigint | undefined;
    let maxFeePerGas: bigint | undefined;
    let maxPriorityFeePerGas: bigint | undefined;

    try {
      const value = await this.#hardhatProvider.request({
        method: "eth_gasPrice",
      });

      assertCanConvertToBigInt(value, "value");

      gasPrice = BigInt(value);
    } catch {}

    const latestBlock = await this.getBlock("latest");
    const baseFeePerGas = latestBlock?.baseFeePerGas;
    if (baseFeePerGas !== undefined && baseFeePerGas !== null) {
      try {
        const value = await this.#hardhatProvider.request({
          method: "eth_maxPriorityFeePerGas",
        });

        assertCanConvertToBigInt(value, "value");

        maxPriorityFeePerGas = BigInt(value);
      } catch {
        // the max priority fee RPC call is not supported by
        // this chain
      }

      maxPriorityFeePerGas = maxPriorityFeePerGas ?? 1_000_000_000n;
      maxFeePerGas = 2n * baseFeePerGas + maxPriorityFeePerGas;
    }

    return new FeeData(gasPrice, maxFeePerGas, maxPriorityFeePerGas);
  }

  public async getBalance(
    address: AddressLike,
    blockTag?: BlockTag | undefined,
  ): Promise<bigint> {
    const resolvedAddress = await this.#getAddress(address);
    const resolvedBlockTag = await this.#getBlockTag(blockTag);
    const rpcBlockTag = this.#getRpcBlockTag(resolvedBlockTag);

    const balance = await this.#hardhatProvider.request({
      method: "eth_getBalance",
      params: [resolvedAddress, rpcBlockTag],
    });

    assertCanConvertToBigInt(balance, "balance");

    return BigInt(balance);
  }

  public async getTransactionCount(
    address: AddressLike,
    blockTag?: BlockTag | undefined,
  ): Promise<number> {
    const resolvedAddress = await this.#getAddress(address);
    const resolvedBlockTag = await this.#getBlockTag(blockTag);
    const rpcBlockTag = this.#getRpcBlockTag(resolvedBlockTag);

    const transactionCount = await this.#hardhatProvider.request({
      method: "eth_getTransactionCount",
      params: [resolvedAddress, rpcBlockTag],
    });

    return Number(transactionCount);
  }

  public async getCode(
    address: AddressLike,
    blockTag?: BlockTag | undefined,
  ): Promise<string> {
    const resolvedAddress = await this.#getAddress(address);
    const resolvedBlockTag = await this.#getBlockTag(blockTag);
    const rpcBlockTag = this.#getRpcBlockTag(resolvedBlockTag);

    const code = await this.#hardhatProvider.request({
      method: "eth_getCode",
      params: [resolvedAddress, rpcBlockTag],
    });

    assertHardhatInvariant(typeof code === "string", "code should be a string");

    return code;
  }

  public async getStorage(
    address: AddressLike,
    position: ethers.BigNumberish,
    blockTag?: BlockTag | undefined,
  ): Promise<string> {
    const resolvedAddress = await this.#getAddress(address);
    const resolvedPosition = getBigInt(position, "position");
    const resolvedBlockTag = await this.#getBlockTag(blockTag);
    const rpcBlockTag = this.#getRpcBlockTag(resolvedBlockTag);

    const storage = await this.#hardhatProvider.request({
      method: "eth_getStorageAt",
      params: [
        resolvedAddress,
        numberToHexString(resolvedPosition),
        rpcBlockTag,
      ],
    });

    assertHardhatInvariant(
      typeof storage === "string",
      "storage should be a string",
    );

    return storage;
  }

  public async estimateGas(tx: TransactionRequest): Promise<bigint> {
    const blockTag =
      tx.blockTag === undefined ? "pending" : this.#getBlockTag(tx.blockTag);
    const [resolvedTx, resolvedBlockTag] = await Promise.all([
      this.#getTransactionRequest(tx),
      blockTag,
    ]);

    const rpcTransaction = getRpcTransaction(resolvedTx);
    const rpcBlockTag = this.#getRpcBlockTag(resolvedBlockTag);

    const gasEstimation = await this.#hardhatProvider.request({
      method: "eth_estimateGas",
      params: [rpcTransaction, rpcBlockTag],
    });

    assertCanConvertToBigInt(gasEstimation, "gasEstimation");

    return BigInt(gasEstimation);
  }

  public async call(tx: TransactionRequest): Promise<string> {
    const [resolvedTx, resolvedBlockTag] = await Promise.all([
      this.#getTransactionRequest(tx),
      this.#getBlockTag(tx.blockTag),
    ]);
    const rpcTransaction = getRpcTransaction(resolvedTx);
    const rpcBlockTag = this.#getRpcBlockTag(resolvedBlockTag);

    const call = await this.#hardhatProvider.request({
      method: "eth_call",
      params: [rpcTransaction, rpcBlockTag],
    });

    assertHardhatInvariant(typeof call === "string", "call should be a string");

    return call;
  }

  public async broadcastTransaction(
    signedTx: string,
  ): Promise<ethers.TransactionResponse> {
    const hashPromise = this.#hardhatProvider.request({
      method: "eth_sendRawTransaction",
      params: [signedTx],
    });

    const [hash, blockNumber] = await Promise.all([
      hashPromise,
      this.getBlockNumber(),
    ]);

    assertHardhatInvariant(typeof hash === "string", "hash should be a string");

    const tx = Transaction.from(signedTx);

    assertHardhatInvariant(
      tx.hash !== null,
      "Hash of signed tx shouldn't be null",
    );

    if (tx.hash !== hash) {
      throw new HardhatError(
        HardhatError.ERRORS.ETHERS.BROADCASTED_TX_DIFFERENT_HASH,
        {
          txHash: tx.hash,
          broadcastedTxHash: hash,
        },
      );
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- 'tx' overlaps with the type exported by ethers
    return this.#wrapTransactionResponse(tx as any).replaceableTransaction(
      blockNumber,
    );
  }

  public async getBlock(
    blockHashOrBlockTag: BlockTag,
    prefetchTxs?: boolean | undefined,
  ): Promise<ethers.Block | null> {
    const block = await this.#getBlock(
      blockHashOrBlockTag,
      prefetchTxs ?? false,
    );

    if (block === null || block === undefined) {
      return null;
    }

    return this.#wrapBlock(block);
  }

  public async getTransaction(
    hash: string,
  ): Promise<ethers.TransactionResponse | null> {
    const transaction = await this.#hardhatProvider.request({
      method: "eth_getTransactionByHash",
      params: [hash],
    });

    if (transaction === null || transaction === undefined) {
      return null;
    }

    return this.#wrapTransactionResponse(
      formatTransactionResponse(transaction),
    );
  }

  public async getTransactionReceipt(
    hash: string,
  ): Promise<ethers.TransactionReceipt | null> {
    const receipt = await this.#hardhatProvider.request({
      method: "eth_getTransactionReceipt",
      params: [hash],
    });

    if (receipt === null || receipt === undefined) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- 'receipt' overlaps with the type exported by ethers
    return this.#wrapTransactionReceipt(receipt as TransactionReceiptParams);
  }

  public async getTransactionResult(_hash: string): Promise<string | null> {
    throw new HardhatError(HardhatError.ERRORS.ETHERS.METHOD_NOT_IMPLEMENTED, {
      method: "HardhatEthersProvider.getTransactionResult",
    });
  }

  public async getLogs(
    filter: Filter | FilterByBlockHash,
  ): Promise<ethers.Log[]> {
    const resolvedFilter = await this.#getFilter(filter);

    const logs = await this.#hardhatProvider.request({
      method: "eth_getLogs",
      params: [resolvedFilter],
    });

    assertHardhatInvariant(Array.isArray(logs), "logs should be an array");

    return logs.map((l: any) => this.#wrapLog(formatLog(l)));
  }

  public async resolveName(_ensName: string): Promise<string | null> {
    throw new HardhatError(HardhatError.ERRORS.ETHERS.METHOD_NOT_IMPLEMENTED, {
      method: "HardhatEthersProvider.resolveName",
    });
  }

  public async lookupAddress(_address: string): Promise<string | null> {
    throw new HardhatError(HardhatError.ERRORS.ETHERS.METHOD_NOT_IMPLEMENTED, {
      method: "HardhatEthersProvider.lookupAddress",
    });
  }

  public async waitForTransaction(
    _hash: string,
    _confirms?: number | undefined,
    _timeout?: number | undefined,
  ): Promise<ethers.TransactionReceipt | null> {
    throw new HardhatError(HardhatError.ERRORS.ETHERS.METHOD_NOT_IMPLEMENTED, {
      method: "HardhatEthersProvider.waitForTransaction",
    });
  }

  public async waitForBlock(
    _blockTag?: BlockTag | undefined,
  ): Promise<ethers.Block> {
    throw new HardhatError(HardhatError.ERRORS.ETHERS.METHOD_NOT_IMPLEMENTED, {
      method: "HardhatEthersProvider.waitForBlock",
    });
  }

  // -------------------------------------- //
  // event-emitter related public functions //
  // -------------------------------------- //

  public async on(
    ethersEvent: ProviderEvent,
    listener: Listener,
  ): Promise<this> {
    const event = ethersToHardhatEvent(ethersEvent);

    if (event.kind === "block") {
      await this.#onBlock(listener, { once: false });
    } else if (event.kind === "transactionHash") {
      await this.#onTransactionHash(event.txHash, listener, { once: false });
    } else if (event.kind === "event") {
      const { eventFilter } = event;
      const blockListener = this.#getBlockListenerForEvent(
        eventFilter,
        listener,
      );

      await this.#addEventListener(eventFilter, listener, blockListener);

      await this.on("block", blockListener);
    } else {
      const _exhaustiveCheck: never = event;
    }

    return this;
  }

  public async once(
    ethersEvent: ProviderEvent,
    listener: Listener,
  ): Promise<this> {
    const event = ethersToHardhatEvent(ethersEvent);

    if (event.kind === "block") {
      await this.#onBlock(listener, { once: true });
    } else if (event.kind === "transactionHash") {
      await this.#onTransactionHash(event.txHash, listener, { once: true });
    } else if (event.kind === "event") {
      const { eventFilter } = event;
      const blockListener = this.#getBlockListenerForEvent(
        eventFilter,
        listener,
      );

      await this.#addEventListener(eventFilter, listener, blockListener);

      await this.once("block", blockListener);
    } else {
      const _exhaustiveCheck: never = event;
    }

    return this;
  }

  public async emit(
    ethersEvent: ProviderEvent,
    ...args: any[]
  ): Promise<boolean> {
    const event = ethersToHardhatEvent(ethersEvent);

    if (event.kind === "block") {
      return this.#emitBlock(...args);
    } else if (event.kind === "transactionHash") {
      return this.#emitTransactionHash(event.txHash, ...args);
    } else if (event.kind === "event") {
      throw new HardhatError(
        HardhatError.ERRORS.ETHERS.METHOD_NOT_IMPLEMENTED,
        {
          method: "emit(event)",
        },
      );
    } else {
      const _exhaustiveCheck: never = event;
      return _exhaustiveCheck;
    }
  }

  public async listenerCount(
    event?: ProviderEvent | undefined,
  ): Promise<number> {
    const listeners = await this.listeners(event);

    return listeners.length;
  }

  public async listeners(
    ethersEvent?: ProviderEvent | undefined,
  ): Promise<Listener[]> {
    if (ethersEvent === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.ETHERS.METHOD_NOT_IMPLEMENTED,
        {
          method: "listeners()",
        },
      );
    }

    const event = ethersToHardhatEvent(ethersEvent);

    if (event.kind === "block") {
      return this.#blockListeners.map(({ listener }) => listener);
    } else if (event.kind === "transactionHash") {
      return (
        this.#transactionHashListeners
          .get(event.txHash)
          ?.map(({ listener }) => listener) ?? []
      );
    } else if (event.kind === "event") {
      const eventListener = await this.#findEventListener(event.eventFilter);

      if (eventListener === undefined) {
        return [];
      }

      return [...eventListener.listenersMap.keys()];
    } else {
      const _exhaustiveCheck: never = event;
      return _exhaustiveCheck;
    }
  }

  public async off(
    ethersEvent: ProviderEvent,
    listener?: Listener | undefined,
  ): Promise<this> {
    const event = ethersToHardhatEvent(ethersEvent);

    if (event.kind === "block") {
      this.#clearBlockListeners(listener);
    } else if (event.kind === "transactionHash") {
      this.#clearTransactionHashListeners(event.txHash, listener);
    } else if (event.kind === "event") {
      const { eventFilter } = event;
      if (listener === undefined) {
        await this.#clearEventListeners(eventFilter);
      } else {
        await this.#removeEventListener(eventFilter, listener);
      }
    } else {
      const _exhaustiveCheck: never = event;
    }

    return this;
  }

  public async removeAllListeners(
    ethersEvent?: ProviderEvent | undefined,
  ): Promise<this> {
    const event =
      ethersEvent !== undefined ? ethersToHardhatEvent(ethersEvent) : undefined;

    if (event === undefined || event.kind === "block") {
      this.#clearBlockListeners();
    }
    if (event === undefined || event.kind === "transactionHash") {
      this.#clearTransactionHashListeners(event?.txHash);
    }
    if (event === undefined || event.kind === "event") {
      await this.#clearEventListeners(event?.eventFilter);
    }

    if (
      event !== undefined &&
      event.kind !== "block" &&
      event.kind !== "transactionHash" &&
      event.kind !== "event"
    ) {
      // this check is only to remember to add a proper if block
      // in this method's implementation if we add support for a
      // new kind of event
      const _exhaustiveCheck: never = event;
    }

    return this;
  }

  public async addListener(
    event: ProviderEvent,
    listener: Listener,
  ): Promise<this> {
    return this.on(event, listener);
  }

  public async removeListener(
    event: ProviderEvent,
    listener: Listener,
  ): Promise<this> {
    return this.off(event, listener);
  }

  public toJSON() {
    return "<EthersHardhatProvider>";
  }

  async #findEventListener(event: EventFilter) {
    for (const item of this.#eventListeners) {
      if ((await deepEqual(item.event, event)) === true) {
        return item;
      }
    }
    return undefined;
  }

  async #findEventListenerIndex(event: EventFilter): Promise<number> {
    for (let i = 0; i < this.#eventListeners.length; i++) {
      if ((await deepEqual(this.#eventListeners[i].event, event)) === true) {
        return i;
      }
    }
    return -1;
  }

  #getAddress(address: AddressLike): string | Promise<string> {
    return resolveAddress(address, this);
  }

  #getBlockTag(blockTag?: BlockTag): string | Promise<string> {
    if (blockTag === null || blockTag === undefined) {
      return "latest";
    }

    switch (blockTag) {
      case "earliest":
        return "0x0";
      case "latest":
      case "pending":
      case "safe":
      case "finalized":
        return blockTag;
      default:
    }

    if (isHexString(blockTag)) {
      if (isHexString(blockTag, 32)) {
        return blockTag;
      }
      return toQuantity(blockTag);
    }

    if (typeof blockTag === "number") {
      if (blockTag >= 0) {
        return toQuantity(blockTag);
      }
      return this.getBlockNumber().then((b) => toQuantity(b + blockTag));
    }

    if (typeof blockTag === "bigint") {
      if (blockTag >= 0n) {
        return toQuantity(blockTag);
      }
      return this.getBlockNumber().then((b) =>
        toQuantity(b + Number(blockTag)),
      );
    }

    throw new HardhatError(HardhatError.ERRORS.ETHERS.INVALID_BLOCK_TAG, {
      blockTag,
    });
  }

  #getTransactionRequest(
    _request: TransactionRequest,
  ): PerformActionTransaction | Promise<PerformActionTransaction> {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- ethers.PreparedTransactionRequest overlaps with PerformActionTransaction
    const request = copyRequest(_request) as PerformActionTransaction;

    const requestKeys: Array<keyof PerformActionTransaction> = ["to", "from"];

    const promises: Array<Promise<void>> = [];
    requestKeys.forEach((key) => {
      if (request[key] === null || request[key] === undefined) {
        return;
      }

      const addr = resolveAddress(request[key]);

      if (isPromise(addr)) {
        promises.push(
          (async function () {
            request[key] = await addr;
          })(),
        );
      } else {
        request[key] = addr;
      }
    });

    if (request.blockTag !== null && request.blockTag !== undefined) {
      const blockTag = this.#getBlockTag(request.blockTag);
      if (isPromise(blockTag)) {
        promises.push(
          (async function () {
            request.blockTag = await blockTag;
          })(),
        );
      } else {
        request.blockTag = blockTag;
      }
    }

    if (promises.length > 0) {
      return (async function () {
        await Promise.all(promises);
        return request;
      })();
    }

    return request;
  }

  #wrapTransactionResponse(tx: TransactionResponseParams): TransactionResponse {
    return new TransactionResponse(tx, this);
  }

  async #getBlock(
    block: BlockTag | string,
    includeTransactions: boolean,
  ): Promise<any> {
    if (isHexString(block, 32)) {
      return this.#hardhatProvider.request({
        method: "eth_getBlockByHash",
        params: [block, includeTransactions],
      });
    }

    let blockTag = this.#getBlockTag(block);
    if (typeof blockTag !== "string") {
      blockTag = await blockTag;
    }

    return this.#hardhatProvider.request({
      method: "eth_getBlockByNumber",
      params: [blockTag, includeTransactions],
    });
  }

  #wrapBlock(value: BlockParams): Block {
    return new Block(formatBlock(value), this);
  }

  #wrapTransactionReceipt(value: TransactionReceiptParams): TransactionReceipt {
    return new TransactionReceipt(formatTransactionReceipt(value), this);
  }

  #getFilter(
    filter: Filter | FilterByBlockHash,
  ): PerformActionFilter | Promise<PerformActionFilter> {
    // Create a canonical representation of the topics
    const topics = (filter.topics ?? []).map((topic) => {
      if (topic === null || topic === undefined) {
        return null;
      }
      if (Array.isArray(topic)) {
        return concisify(topic.map((t) => t.toLowerCase()));
      }
      return topic.toLowerCase();
    });

    const blockHash = "blockHash" in filter ? filter.blockHash : undefined;

    const resolve = (
      _address: string[],
      fromBlock?: string,
      toBlock?: string,
    ) => {
      let resolvedAddress: undefined | string | string[];
      switch (_address.length) {
        case 0:
          break;
        case 1:
          resolvedAddress = _address[0];
          break;
        default:
          _address.sort();
          resolvedAddress = _address;
      }

      if (blockHash !== undefined) {
        assertHardhatInvariant(
          (fromBlock === null || fromBlock === undefined) &&
            (toBlock === null || toBlock === undefined),
          "invalid filter",
        );
      }

      const resolvedFilter: any = {};
      if (resolvedAddress !== undefined) {
        resolvedFilter.address = resolvedAddress;
      }
      if (topics.length > 0) {
        resolvedFilter.topics = topics;
      }
      if (fromBlock !== undefined) {
        resolvedFilter.fromBlock = fromBlock;
      }
      if (toBlock !== undefined) {
        resolvedFilter.toBlock = toBlock;
      }
      if (blockHash !== undefined) {
        resolvedFilter.blockHash = blockHash;
      }

      return resolvedFilter;
    };

    // Addresses could be async (ENS names or Addressables)
    const address: Array<string | Promise<string>> = [];
    if (filter.address !== undefined) {
      if (Array.isArray(filter.address)) {
        for (const addr of filter.address) {
          address.push(this.#getAddress(addr));
        }
      } else {
        address.push(this.#getAddress(filter.address));
      }
    }

    let resolvedFromBlock: undefined | string | Promise<string>;
    if ("fromBlock" in filter) {
      resolvedFromBlock = this.#getBlockTag(filter.fromBlock);
    }

    let resolvedToBlock: undefined | string | Promise<string>;
    if ("toBlock" in filter) {
      resolvedToBlock = this.#getBlockTag(filter.toBlock);
    }

    if (
      address.filter((a) => typeof a !== "string").length > 0 ||
      (resolvedFromBlock !== null &&
        resolvedFromBlock !== undefined &&
        typeof resolvedFromBlock !== "string") ||
      (resolvedToBlock !== null &&
        resolvedToBlock !== undefined &&
        typeof resolvedToBlock !== "string")
    ) {
      return Promise.all([
        Promise.all(address),
        resolvedFromBlock,
        resolvedToBlock,
      ]).then((result) => {
        return resolve(result[0], result[1], result[2]);
      });
    }

    assertHardhatInvariant(
      address.every((a) => typeof a === "string"),
      "Every address should be a string",
    );

    return resolve(address, resolvedFromBlock, resolvedToBlock);
  }

  #wrapLog(value: LogParams): Log {
    return new Log(formatLog(value), this);
  }

  #getRpcBlockTag(blockTag: string): string | { blockHash: string } {
    if (isHexString(blockTag, 32)) {
      return { blockHash: blockTag };
    }

    return blockTag;
  }

  async #isHardhatNetwork(): Promise<boolean> {
    if (this.#isHardhatNetworkCached === undefined) {
      this.#isHardhatNetworkCached = false;
      try {
        await this.#hardhatProvider.request({ method: "hardhat_metadata" });

        this.#isHardhatNetworkCached = true;
      } catch {}
    }

    return this.#isHardhatNetworkCached;
  }

  // ------------------------------------- //
  // event-emitter related private helpers //
  // ------------------------------------- //

  async #onTransactionHash(
    transactionHash: string,
    listener: Listener,
    { once }: { once: boolean },
  ): Promise<void> {
    const listeners = this.#transactionHashListeners.get(transactionHash) ?? [];
    listeners.push({ listener, once });
    this.#transactionHashListeners.set(transactionHash, listeners);
    await this.#startTransactionHashPolling();
  }

  #clearTransactionHashListeners(
    transactionHash?: string,
    listener?: Listener,
  ): void {
    if (transactionHash === undefined) {
      this.#transactionHashListeners = new Map();
    } else if (listener === undefined) {
      this.#transactionHashListeners.delete(transactionHash);
    } else {
      const listeners = this.#transactionHashListeners.get(transactionHash);
      if (listeners !== undefined) {
        const listenerIndex = listeners.findIndex(
          (item) => item.listener === listener,
        );

        if (listenerIndex >= 0) {
          listeners.splice(listenerIndex, 1);
        }

        if (listeners.length === 0) {
          this.#transactionHashListeners.delete(transactionHash);
        }
      }
    }

    if (this.#transactionHashListeners.size === 0) {
      this.#stopTransactionHashPolling();
    }
  }

  async #startTransactionHashPolling() {
    await this.#pollTransactionHashes();
  }

  #stopTransactionHashPolling() {
    clearTimeout(this.#transactionHashPollingTimeout);
    this.#transactionHashPollingTimeout = undefined;
  }

  /**
   * Traverse all the registered transaction hashes and check if they were mined.
   *
   * This function should NOT throw.
   */
  async #pollTransactionHashes() {
    try {
      const listenersToRemove: Array<[string, Listener]> = [];

      for (const [
        transactionHash,
        listeners,
      ] of this.#transactionHashListeners.entries()) {
        const receipt = await this.getTransactionReceipt(transactionHash);

        if (receipt !== null) {
          for (const { listener, once } of listeners) {
            listener(receipt);
            if (once) {
              listenersToRemove.push([transactionHash, listener]);
            }
          }
        }
      }

      for (const [transactionHash, listener] of listenersToRemove) {
        this.#clearTransactionHashListeners(transactionHash, listener);
      }
    } catch (e) {
      ensureError(e);

      log(`Error during transaction hash polling: ${e.message}`);
    } finally {
      // it's possible that the first poll cleans all the listeners,
      // in that case we don't set the timeout
      if (this.#transactionHashListeners.size > 0) {
        const _isHardhatNetwork = await this.#isHardhatNetwork();
        const timeout = _isHardhatNetwork ? 50 : 500;

        clearTimeout(this.#transactionHashPollingTimeout);
        this.#transactionHashPollingTimeout = setTimeout(async () => {
          await this.#pollTransactionHashes();
        }, timeout);
      }
    }
  }

  async #startBlockPolling() {
    this.#latestBlockNumberPolled = await this.getBlockNumber();
    await this.#pollBlocks();
  }

  #stopBlockPolling() {
    clearInterval(this.#blockPollingTimeout);
    this.#blockPollingTimeout = undefined;
  }

  async #pollBlocks() {
    try {
      const currentBlockNumber = await this.getBlockNumber();
      const previousBlockNumber = this.#latestBlockNumberPolled ?? 0;

      if (currentBlockNumber === previousBlockNumber) {
        // Don't do anything, there are no new blocks
        return;
      } else if (currentBlockNumber < previousBlockNumber) {
        // This can happen if there was a reset or a snapshot was reverted.
        // We don't know which number the network was reset to, so we update
        // the latest block number seen and do nothing else.
        this.#latestBlockNumberPolled = currentBlockNumber;
        return;
      }

      this.#latestBlockNumberPolled = currentBlockNumber;

      for (
        let blockNumber = previousBlockNumber + 1;
        blockNumber <= this.#latestBlockNumberPolled;
        blockNumber++
      ) {
        const listenersToRemove: Listener[] = [];

        for (const { listener, once } of this.#blockListeners) {
          listener(blockNumber);
          if (once) {
            listenersToRemove.push(listener);
          }
        }

        for (const listener of listenersToRemove) {
          this.#clearBlockListeners(listener);
        }
      }
    } catch (e) {
      ensureError(e);

      log(`Error during block polling: ${e.message}`);
    } finally {
      // it's possible that the first poll cleans all the listeners,
      // in that case we don't set the timeout
      if (this.#blockListeners.length > 0) {
        const _isHardhatNetwork = await this.#isHardhatNetwork();
        const timeout = _isHardhatNetwork ? 50 : 500;

        clearTimeout(this.#blockPollingTimeout);
        this.#blockPollingTimeout = setTimeout(async () => {
          await this.#pollBlocks();
        }, timeout);
      }
    }
  }

  #emitTransactionHash(transactionHash: string, ...args: any[]): boolean {
    const listeners = this.#transactionHashListeners.get(transactionHash);
    const listenersToRemove: Listener[] = [];

    if (listeners === undefined) {
      return false;
    }

    for (const { listener, once } of listeners) {
      listener(...args);
      if (once) {
        listenersToRemove.push(listener);
      }
    }

    for (const listener of listenersToRemove) {
      this.#clearTransactionHashListeners(transactionHash, listener);
    }

    return true;
  }

  #emitBlock(...args: any[]): boolean {
    const listeners = this.#blockListeners;
    const listenersToRemove: Listener[] = [];

    for (const { listener, once } of listeners) {
      listener(...args);
      if (once) {
        listenersToRemove.push(listener);
      }
    }

    for (const listener of listenersToRemove) {
      this.#clearBlockListeners(listener);
    }

    return true;
  }

  async #onBlock(
    listener: Listener,
    { once }: { once: boolean },
  ): Promise<void> {
    const listeners = this.#blockListeners;
    listeners.push({ listener, once });
    this.#blockListeners = listeners;
    await this.#startBlockPolling();
  }

  #clearBlockListeners(listener?: Listener): void {
    if (listener === undefined) {
      this.#blockListeners = [];
      this.#stopBlockPolling();
    } else {
      const listenerIndex = this.#blockListeners.findIndex(
        (item) => item.listener === listener,
      );

      if (listenerIndex >= 0) {
        this.#blockListeners.splice(listenerIndex, 1);
      }

      if (this.#blockListeners.length === 0) {
        this.#stopBlockPolling();
      }
    }
  }

  #getBlockListenerForEvent(event: EventFilter, listener: Listener) {
    return async (blockNumber: number) => {
      const eventLogs = await this.getLogs({
        fromBlock: blockNumber,
        toBlock: blockNumber,
      });

      const matchingLogs = eventLogs.filter((e) => {
        if (event.address !== undefined && e.address !== event.address) {
          return false;
        }
        if (event.topics !== undefined) {
          const topicsToMatch = event.topics;
          // the array of topics to match can be smaller than the actual
          // array of topics; in that case only those first topics are
          // checked
          const topics = e.topics.slice(0, topicsToMatch.length);

          const topicsMatch = topics.every((topic, i) => {
            const topicToMatch = topicsToMatch[i];
            if (topicToMatch === null) {
              return true;
            }

            if (typeof topicToMatch === "string") {
              return topic === topicsToMatch[i];
            }

            return topicToMatch.includes(topic);
          });

          return topicsMatch;
        }

        return true;
      });

      for (const matchingLog of matchingLogs) {
        listener(matchingLog);
      }
    };
  }

  async #addEventListener(
    event: EventFilter,
    listener: Listener,
    blockListener: Listener,
  ) {
    const eventListener = await this.#findEventListener(event);

    if (eventListener === undefined) {
      const listenersMap = new Map();
      listenersMap.set(listener, blockListener);
      this.#eventListeners.push({ event, listenersMap });
    } else {
      eventListener.listenersMap.set(listener, blockListener);
    }
  }

  async #clearEventListeners(event?: EventFilter) {
    const blockListenersToRemove: Listener[] = [];

    if (event === undefined) {
      for (const eventListener of this.#eventListeners) {
        for (const blockListener of eventListener.listenersMap.values()) {
          blockListenersToRemove.push(blockListener);
        }
      }

      this.#eventListeners = [];
    } else {
      const index = await this.#findEventListenerIndex(event);

      if (index === -1) {
        const { listenersMap } = this.#eventListeners[index];
        this.#eventListeners.splice(index, 1);
        for (const blockListener of listenersMap.values()) {
          blockListenersToRemove.push(blockListener);
        }
      }
    }

    for (const blockListener of blockListenersToRemove) {
      await this.off("block", blockListener);
    }
  }

  async #removeEventListener(event: EventFilter, listener: Listener) {
    const index = await this.#findEventListenerIndex(event);

    if (index === -1) {
      // nothing to do
      return;
    }

    const { listenersMap } = this.#eventListeners[index];

    const blockListener = listenersMap.get(listener);
    listenersMap.delete(listener);
    if (blockListener === undefined) {
      // nothing to do
      return;
    }

    await this.off("block", blockListener);
  }
}

function isPromise<T = any>(value: any): value is Promise<T> {
  return Boolean(value) && typeof value.then === "function";
}

function concisify(items: string[]): string[] {
  items = Array.from(new Set(items).values());
  items.sort();
  return items;
}

function isTransactionHash(x: string): boolean {
  return x.startsWith("0x") && x.length === 66;
}

function isEventFilter(x: ProviderEvent): x is EventFilter {
  if (typeof x !== "string" && !Array.isArray(x) && !("orphan" in x)) {
    return true;
  }

  return false;
}

function ethersToHardhatEvent(
  event: ProviderEvent,
): HardhatEthersProviderEvent {
  if (typeof event === "string") {
    if (event === "block") {
      return { kind: "block" };
    } else if (isTransactionHash(event)) {
      return { kind: "transactionHash", txHash: event };
    } else {
      throw new HardhatError(HardhatError.ERRORS.ETHERS.EVENT_NOT_SUPPORTED, {
        event,
      });
    }
  } else if (isEventFilter(event)) {
    return { kind: "event", eventFilter: event };
  } else {
    throw new HardhatError(HardhatError.ERRORS.ETHERS.EVENT_NOT_SUPPORTED, {
      event,
    });
  }
}
