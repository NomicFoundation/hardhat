import { DefaultStateManager } from "@ethereumjs/vm/dist/state";
import { EIP2929StateManager } from "@ethereumjs/vm/dist/state/interface";
import {
  Account,
  Address,
  BN,
  bufferToHex,
  keccak256,
  KECCAK256_NULL,
  toBuffer,
  unpadBuffer,
} from "ethereumjs-util";
import { Map as ImmutableMap, Record as ImmutableRecord } from "immutable";

import { InternalError } from "../../core/providers/errors";

import { AccountState, makeAccountState } from "./fork/AccountState";
import { randomHash } from "./fork/random";
import { GenesisAccount } from "./node-types";
import { makeAccount } from "./utils/makeAccount";

const encodeStorageKey = (address: Buffer, position: Buffer): string => {
  return `${address.toString("hex")}${unpadBuffer(position).toString("hex")}`;
};

/* tslint:disable only-hardhat-error */

type State = ImmutableMap<string, ImmutableRecord<AccountState>>;

const checkpointedError = (method: string) =>
  new Error(`${method} called when checkpointed`);

const notCheckpointedError = (method: string) =>
  new Error(`${method} called when not checkpointed`);

const notSupportedError = (method: string) =>
  new Error(`${method} is not supported when forking from remote network`);

export class HardhatStateManager implements EIP2929StateManager {
  private _state: State = ImmutableMap();
  private _initialStateRoot: string = randomHash();
  private _stateRoot: string = this._initialStateRoot;
  private _stateRootToState: Map<string, State> = new Map();
  private _originalStorageCache: Map<string, Buffer> = new Map();
  private _stateCheckpoints: string[] = [];
  private _contextChanged = false;

  // used by the DefaultStateManager calls
  private _accessedStorage: Array<Map<string, Set<string>>> = [new Map()];
  private _accessedStorageReverted: Array<Map<string, Set<string>>> = [
    new Map(),
  ];

  constructor() {
    this._state = ImmutableMap();

    this._stateRootToState.set(this._initialStateRoot, this._state);
  }

  public async initializeGenesisAccounts(genesisAccounts: GenesisAccount[]) {
    for (const ga of genesisAccounts) {
      const { address, account } = makeAccount(ga);
      this._putAccount(address, account);
    }

    this._stateRootToState.set(this._initialStateRoot, this._state);
  }

  public copy(): HardhatStateManager {
    const hsm = new HardhatStateManager();
    hsm._state = this._state;
    hsm._stateRoot = this._stateRoot;

    // because this map is append-only we don't need to copy it
    hsm._stateRootToState = this._stateRootToState;
    return hsm;
  }

  public async getAccount(address: Address): Promise<Account> {
    const localAccount = this._state.get(address.toString());

    const localNonce = localAccount?.get("nonce");
    const localBalance = localAccount?.get("balance");
    const localCode = localAccount?.get("code");

    const nonce: Buffer | BN =
      localNonce !== undefined ? toBuffer(localNonce) : new BN(0);

    const balance: Buffer | BN =
      localBalance !== undefined ? toBuffer(localBalance) : new BN(0);

    const code: Buffer =
      localCode !== undefined ? toBuffer(localCode) : toBuffer([]);

    const codeHash = keccak256(code);
    // We ignore stateRoot since we found that it is not used anywhere of interest to us
    return Account.fromAccountData({ nonce, balance, codeHash });
  }

  public async putAccount(address: Address, account: Account): Promise<void> {
    this._putAccount(address, account);
  }

  public touchAccount(address: Address): void {
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

    return toBuffer([]);
  }

  public async getContractStorage(
    address: Address,
    key: Buffer
  ): Promise<Buffer> {
    if (key.length !== 32) {
      throw new Error("Storage key must be 32 bytes long");
    }

    const account = this._state.get(address.toString());
    const localValue = account?.get("storage").get(bufferToHex(key));

    if (localValue !== undefined) {
      return toBuffer(localValue);
    }

    return toBuffer([]);
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
      .set("storage", ImmutableMap());
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

  public async dumpStorage(address: Address): Promise<Record<string, string>> {
    throw notSupportedError("dumpStorage");
  }

  public async hasGenesisState(): Promise<boolean> {
    throw notSupportedError("hasGenesisState");
  }

  public async generateCanonicalGenesis(): Promise<void> {
    throw notSupportedError("generateCanonicalGenesis");
  }

  public async generateGenesis(initState: any): Promise<void> {
    throw notSupportedError("generateGenesis");
  }

  public async accountIsEmpty(address: Address): Promise<boolean> {
    const account = await this.getAccount(address);
    // From https://eips.ethereum.org/EIPS/eip-161
    // An account is considered empty when it has no code and zero nonce and zero balance.
    return (
      new BN(account.nonce).eqn(0) &&
      new BN(account.balance).eqn(0) &&
      account.codeHash.equals(KECCAK256_NULL)
    );
  }

  public async cleanupTouchedAccounts(): Promise<void> {
    // We do not do anything here, because cleaning accounts only affects the
    // stateRoot. Since the stateRoot is fake anyway there is no need to
    // perform this operation.
  }

  public restoreForkBlockContext(stateRoot: Buffer) {
    if (this._stateCheckpoints.length !== 0) {
      throw checkpointedError("restoreForkBlockContext");
    }
    this._setStateRoot(stateRoot);
    if (this._contextChanged) {
      this._contextChanged = false;
    }
  }

  public accountExists(address: Address): never {
    throw new InternalError(
      "Hardhat Network can't fork from networks running a hardfork older than Spurious Dragon"
    );
  }

  public async deleteAccount(address: Address): Promise<void> {
    this._state.delete(address.toString());
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

  // the following methods are copied verbatim from
  // DefaultStateManager

  public isWarmedAddress(address: Buffer): boolean {
    return DefaultStateManager.prototype.isWarmedAddress.call(this, address);
  }

  public addWarmedAddress(address: Buffer): void {
    return DefaultStateManager.prototype.addWarmedAddress.call(this, address);
  }

  public isWarmedStorage(address: Buffer, slot: Buffer): boolean {
    return DefaultStateManager.prototype.isWarmedStorage.call(
      this,
      address,
      slot
    );
  }

  public addWarmedStorage(address: Buffer, slot: Buffer): void {
    return DefaultStateManager.prototype.addWarmedStorage.call(
      this,
      address,
      slot
    );
  }

  public clearWarmedAccounts(): void {
    return DefaultStateManager.prototype.clearWarmedAccounts.call(this);
  }

  private _putAccount(address: Address, account: Account): void {
    // Because the vm only ever modifies the nonce, balance and codeHash using this
    // method we ignore the stateRoot property
    const hexAddress = address.toString();
    let localAccount = this._state.get(hexAddress) ?? makeAccountState();
    localAccount = localAccount
      .set("nonce", bufferToHex(account.nonce.toBuffer()))
      .set("balance", bufferToHex(account.balance.toBuffer()));

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
}
