import { StateManager } from "@nomicfoundation/ethereumjs-statemanager";
import {
  Account,
  bigIntToHex,
  bufferToBigInt,
  Address,
  bufferToHex,
  KECCAK256_NULL,
  toBuffer,
  unpadBuffer,
} from "@nomicfoundation/ethereumjs-util";
import { Map as ImmutableMap, Record as ImmutableRecord } from "immutable";

import { assertHardhatInvariant } from "../../../core/errors";
import { InternalError } from "../../../core/providers/errors";
import { keccak256 } from "../../../util/keccak";
import { JsonRpcClient } from "../../jsonrpc/client";
import { GenesisAccount } from "../node-types";
import { makeAccount } from "../utils/makeAccount";
import { randomHash } from "../utils/random";

import {
  AccountState,
  makeAccountState,
  makeEmptyAccountState,
} from "./AccountState";

const encodeStorageKey = (address: Buffer, position: Buffer): string => {
  return `${address.toString("hex")}${unpadBuffer(position).toString("hex")}`;
};

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */

type State = ImmutableMap<string, ImmutableRecord<AccountState>>;

const checkpointedError = (method: string) =>
  new Error(`${method} called when checkpointed`);

const notCheckpointedError = (method: string) =>
  new Error(`${method} called when not checkpointed`);

const notSupportedError = (method: string) =>
  new Error(`${method} is not supported when forking from remote network`);

export class ForkStateManager implements StateManager {
  private _state: State = ImmutableMap<string, ImmutableRecord<AccountState>>();
  private _initialStateRoot: string = randomHash();
  private _stateRoot: string = this._initialStateRoot;
  private _stateRootToState: Map<string, State> = new Map();
  private _originalStorageCache: Map<string, Buffer> = new Map();
  private _stateCheckpoints: string[] = [];
  private _contextBlockNumber = this._forkBlockNumber;
  private _contextChanged = false;

  constructor(
    private readonly _jsonRpcClient: JsonRpcClient,
    private readonly _forkBlockNumber: bigint
  ) {
    this._state = ImmutableMap<string, ImmutableRecord<AccountState>>();

    this._stateRootToState.set(this._initialStateRoot, this._state);
  }

  public async initializeGenesisAccounts(genesisAccounts: GenesisAccount[]) {
    const accounts: Array<{ address: Address; account: Account }> = [];
    const noncesPromises: Array<Promise<bigint>> = [];

    for (const ga of genesisAccounts) {
      const account = makeAccount(ga);
      accounts.push(account);

      const noncePromise = this._jsonRpcClient.getTransactionCount(
        account.address.toBuffer(),
        this._forkBlockNumber
      );
      noncesPromises.push(noncePromise);
    }

    const nonces = await Promise.all(noncesPromises);

    assertHardhatInvariant(
      accounts.length === nonces.length,
      "Nonces and accounts should have the same length"
    );

    for (const [index, { address, account }] of accounts.entries()) {
      const nonce = nonces[index];
      account.nonce = nonce;
      this._putAccount(address, account);
    }

    this._stateRootToState.set(this._initialStateRoot, this._state);
  }

  public copy(): ForkStateManager {
    const fsm = new ForkStateManager(
      this._jsonRpcClient,
      this._forkBlockNumber
    );
    fsm._state = this._state;
    fsm._stateRoot = this._stateRoot;

    // because this map is append-only we don't need to copy it
    fsm._stateRootToState = this._stateRootToState;
    return fsm;
  }

  public async getAccount(address: Address): Promise<Account> {
    const localAccount = this._state.get(address.toString());

    const localNonce = localAccount?.get("nonce");
    const localBalance = localAccount?.get("balance");
    const localCode = localAccount?.get("code");

    let nonce: Buffer | bigint | undefined =
      localNonce !== undefined ? toBuffer(localNonce) : undefined;

    let balance: Buffer | bigint | undefined =
      localBalance !== undefined ? toBuffer(localBalance) : undefined;

    let code: Buffer | undefined =
      localCode !== undefined ? toBuffer(localCode) : undefined;

    if (balance === undefined || nonce === undefined || code === undefined) {
      const accountData = await this._jsonRpcClient.getAccountData(
        address,
        this._contextBlockNumber
      );

      if (nonce === undefined) {
        nonce = accountData.transactionCount;
      }

      if (balance === undefined) {
        balance = accountData.balance;
      }

      if (code === undefined) {
        code = accountData.code;
      }
    }

    const codeHash = keccak256(code);
    // We ignore stateRoot since we found that it is not used anywhere of interest to us
    return Account.fromAccountData({ nonce, balance, codeHash });
  }

  public async putAccount(address: Address, account: Account): Promise<void> {
    this._putAccount(address, account);
  }

  public touchAccount(_address: Address): void {
    // We don't do anything here. See cleanupTouchedAccounts for explanation
  }

  public async putContractCode(address: Address, value: Buffer): Promise<void> {
    const hexAddress = address.toString();
    const account = (this._state.get(hexAddress) ?? makeAccountState()).set(
      "code",
      bufferToHex(value)
    );
    this._state = this._state.set(hexAddress, account);
  }

  public async getContractCode(address: Address): Promise<Buffer> {
    const localCode = this._state.get(address.toString())?.get("code");
    if (localCode !== undefined) {
      return toBuffer(localCode);
    }

    const accountData = await this._jsonRpcClient.getAccountData(
      address,
      this._contextBlockNumber
    );

    return accountData.code;
  }

  public async getContractStorage(
    address: Address,
    key: Buffer
  ): Promise<Buffer> {
    if (key.length !== 32) {
      throw new Error("Storage key must be 32 bytes long");
    }

    const account = this._state.get(address.toString());
    const contractStorageCleared = account?.get("storageCleared") ?? false;
    const localValue = account?.get("storage").get(bufferToHex(key));

    if (localValue !== undefined) {
      return toBuffer(localValue);
    }

    const slotCleared = localValue === null;
    if (contractStorageCleared || slotCleared) {
      return toBuffer([]);
    }

    const remoteValue = await this._jsonRpcClient.getStorageAt(
      address,
      bufferToBigInt(key),
      this._contextBlockNumber
    );

    return unpadBuffer(remoteValue);
  }

  public async putContractStorage(
    address: Address,
    key: Buffer,
    value: Buffer
  ): Promise<void> {
    if (key.length !== 32) {
      throw new Error("Storage key must be 32 bytes long");
    }

    if (value.length > 32) {
      throw new Error("Storage value cannot be longer than 32 bytes");
    }

    const unpaddedValue = unpadBuffer(value);

    const hexAddress = address.toString();
    let account = this._state.get(hexAddress) ?? makeAccountState();
    const currentStorage = account.get("storage");

    let newValue: string | null;
    if (unpaddedValue.length === 0) {
      // if the value is an empty array or only zeros, the storage is deleted
      newValue = null;
    } else {
      newValue = bufferToHex(unpaddedValue);
    }

    const newStorage = currentStorage.set(bufferToHex(key), newValue);

    account = account.set("storage", newStorage);

    this._state = this._state.set(hexAddress, account);
  }

  public async clearContractStorage(address: Address): Promise<void> {
    const hexAddress = address.toString();
    let account = this._state.get(hexAddress) ?? makeAccountState();
    account = account
      .set("storageCleared", true)
      .set("storage", ImmutableMap<string, string | null>());
    this._state = this._state.set(hexAddress, account);
  }

  public async checkpoint(): Promise<void> {
    const stateRoot = await this.getStateRoot();
    this._stateCheckpoints.push(bufferToHex(stateRoot));
  }

  public async commit(): Promise<void> {
    if (this._stateCheckpoints.length === 0) {
      throw notCheckpointedError("commit");
    }
    this._stateCheckpoints.pop();
  }

  public async revert(): Promise<void> {
    const checkpointedRoot = this._stateCheckpoints.pop();
    if (checkpointedRoot === undefined) {
      throw notCheckpointedError("revert");
    }
    await this.setStateRoot(toBuffer(checkpointedRoot));
  }

  public async getStateRoot(): Promise<Buffer> {
    if (this._stateRootToState.get(this._stateRoot) !== this._state) {
      this._stateRoot = randomHash();
      this._stateRootToState.set(this._stateRoot, this._state);
    }
    return toBuffer(this._stateRoot);
  }

  public async setStateRoot(stateRoot: Buffer): Promise<void> {
    this._setStateRoot(stateRoot);
  }

  public async dumpStorage(_address: Address): Promise<Record<string, string>> {
    throw notSupportedError("dumpStorage");
  }

  public async hasGenesisState(): Promise<boolean> {
    throw notSupportedError("hasGenesisState");
  }

  public async generateCanonicalGenesis(): Promise<void> {
    throw notSupportedError("generateCanonicalGenesis");
  }

  public async generateGenesis(_initState: any): Promise<void> {
    throw notSupportedError("generateGenesis");
  }

  public async accountIsEmpty(address: Address): Promise<boolean> {
    const account = await this.getAccount(address);
    // From https://eips.ethereum.org/EIPS/eip-161
    // An account is considered empty when it has no code and zero nonce and zero balance.
    return (
      account.nonce === 0n &&
      account.balance === 0n &&
      account.codeHash.equals(KECCAK256_NULL)
    );
  }

  public async cleanupTouchedAccounts(): Promise<void> {
    // We do not do anything here, because cleaning accounts only affects the
    // stateRoot. Since the stateRoot is fake anyway there is no need to
    // perform this operation.
  }

  public setBlockContext(
    stateRoot: Buffer,
    blockNumber: bigint,
    irregularState?: Buffer
  ) {
    if (this._stateCheckpoints.length !== 0) {
      throw checkpointedError("setBlockContext");
    }

    if (irregularState !== undefined) {
      this._setStateRoot(irregularState);
      return;
    }

    if (blockNumber === this._forkBlockNumber) {
      this._setStateRoot(toBuffer(this._initialStateRoot));
      return;
    }
    if (blockNumber > this._forkBlockNumber) {
      this._setStateRoot(stateRoot);
      return;
    }
    this._contextChanged = true;
    this._state = ImmutableMap<string, ImmutableRecord<AccountState>>();
    this._stateRoot = bufferToHex(stateRoot);
    this._stateRootToState.set(this._stateRoot, this._state);
    this._contextBlockNumber = blockNumber;
    // Note that we don't need to clear the original storage cache here
    // because the VM does it before executing a message anyway.
  }

  public restoreForkBlockContext(stateRoot: Buffer) {
    if (this._stateCheckpoints.length !== 0) {
      throw checkpointedError("restoreForkBlockContext");
    }
    this._setStateRoot(stateRoot);
    if (this._contextChanged) {
      this._contextChanged = false;
      this._contextBlockNumber = this._forkBlockNumber;
    }
  }

  public accountExists(_address: Address): never {
    throw new InternalError(
      "Hardhat Network can't fork from networks running a hardfork older than Spurious Dragon"
    );
  }

  public async deleteAccount(address: Address): Promise<void> {
    // we set an empty account instead of deleting it to avoid
    // re-fetching the state from the remote node.
    // This is only valid post spurious dragon, but we don't support older hardforks when forking.
    const emptyAccount = makeEmptyAccountState();
    this._state = this._state.set(address.toString(), emptyAccount);
  }

  public clearOriginalStorageCache(): void {
    this._originalStorageCache = new Map();
  }

  public async getOriginalContractStorage(
    address: Address,
    key: Buffer
  ): Promise<Buffer> {
    const storageKey = encodeStorageKey(address.toBuffer(), key);
    const cachedValue = this._originalStorageCache.get(storageKey);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const value = await this.getContractStorage(address, key);
    this._originalStorageCache.set(storageKey, value);

    return value;
  }

  private _putAccount(address: Address, account: Account): void {
    // Because the vm only ever modifies the nonce, balance and codeHash using this
    // method we ignore the stateRoot property
    const hexAddress = address.toString();
    let localAccount = this._state.get(hexAddress) ?? makeAccountState();
    localAccount = localAccount
      .set("nonce", bigIntToHex(account.nonce))
      .set("balance", bigIntToHex(account.balance));

    // Code is set to empty string here to prevent unnecessary
    // JsonRpcClient.getCode calls in getAccount method
    if (account.codeHash.equals(KECCAK256_NULL)) {
      localAccount = localAccount.set("code", "0x");
    }
    this._state = this._state.set(hexAddress, localAccount);
  }

  private _setStateRoot(stateRoot: Buffer) {
    const newRoot = bufferToHex(stateRoot);
    const state = this._stateRootToState.get(newRoot);
    if (state === undefined) {
      throw new Error("Unknown state root");
    }
    this._stateRoot = newRoot;
    this._state = state;
  }

  public async hasStateRoot(root: Buffer): Promise<boolean> {
    return this._state.has(bufferToHex(root));
  }

  public async flush(): Promise<void> {
    // not implemented
  }

  public async modifyAccountFields(
    address: Address,
    accountFields: any
  ): Promise<void> {
    // copied from BaseStateManager
    const account = await this.getAccount(address);
    account.nonce = accountFields.nonce ?? account.nonce;
    account.balance = accountFields.balance ?? account.balance;
    account.storageRoot = accountFields.storageRoot ?? account.storageRoot;
    account.codeHash = accountFields.codeHash ?? account.codeHash;
    await this.putAccount(address, account);
  }
}
