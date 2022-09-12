import {
  Account,
  Address,
  bigIntToHex,
  bufferToHex,
  KECCAK256_NULL,
  toBuffer,
  unpadBuffer,
} from "@nomicfoundation/ethereumjs-util";
import { keccak256 } from "ethereum-cryptography/keccak";
import { Map as ImmutableMap, Record as ImmutableRecord } from "immutable";
import { InternalError } from "../../core/providers/errors";

import {
  AccountState,
  makeAccountState,
  makeEmptyAccountState,
} from "./fork/AccountState";
import { GenesisAccount } from "./node-types";
import { makeAccount } from "./utils/makeAccount";
import { randomHash } from "./utils/random";

const encodeStorageKey = (address: Buffer, position: Buffer): string => {
  return `${address.toString("hex")}${unpadBuffer(position).toString("hex")}`;
};

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */

type State = ImmutableMap<string, ImmutableRecord<AccountState>>;

const checkpointedError = (method: string) =>
  new Error(`${method} called when checkpointed`);

const notCheckpointedError = (method: string) =>
  new Error(`${method} called when not checkpointed`);

const notSupportedError = (method: string) =>
  new Error(`${method} is not supported when forking from remote network`);

/**
 * This class implements ethereumjs's StateManager interface, but using
 * only sync methods. To verify that is correct, uncomment the
 * `implements Statemanager` part and modify the necessary signatures.
 */
export class SyncStateManager /* implements StateManager */ {
  private _state: State = ImmutableMap<string, ImmutableRecord<AccountState>>();
  private _initialStateRoot: string = randomHash();
  private _stateRoot: string = this._initialStateRoot;
  private _stateRootToState: Map<string, State> = new Map();
  private _originalStorageCache: Map<string, Buffer> = new Map();
  private _stateCheckpoints: string[] = [];
  private _contextChanged = false;

  constructor() {
    this._state = ImmutableMap<string, ImmutableRecord<AccountState>>();

    this._stateRootToState.set(this._initialStateRoot, this._state);
  }

  public initializeGenesisAccounts(genesisAccounts: GenesisAccount[]) {
    for (const ga of genesisAccounts) {
      const { address, account } = makeAccount(ga);
      this._putAccount(address, account);
    }

    this._stateRootToState.set(this._initialStateRoot, this._state);
  }

  public copy(): SyncStateManager {
    const fsm = new SyncStateManager();
    fsm._state = this._state;
    fsm._stateRoot = this._stateRoot;

    // because this map is append-only we don't need to copy it
    fsm._stateRootToState = this._stateRootToState;
    return fsm;
  }

  public getAccount(address: Address): Account {
    const localAccount = this._state.get(address.toString());

    const localNonce = localAccount?.get("nonce");
    const localBalance = localAccount?.get("balance");
    const localCode = localAccount?.get("code");

    const nonce: Buffer | bigint =
      localNonce !== undefined ? toBuffer(localNonce) : 0n;

    const balance: Buffer | bigint =
      localBalance !== undefined ? toBuffer(localBalance) : 0n;

    const code: Buffer =
      localCode !== undefined ? toBuffer(localCode) : toBuffer([]);

    const codeHash = keccak256(code);
    // We ignore stateRoot since we found that it is not used anywhere of interest to us
    return Account.fromAccountData({ nonce, balance, codeHash });
  }

  public putAccount(address: Address, account: Account): void {
    this._putAccount(address, account);
  }

  public putContractCode(address: Address, value: Buffer): void {
    const hexAddress = address.toString();
    const account = (this._state.get(hexAddress) ?? makeAccountState()).set(
      "code",
      bufferToHex(value)
    );
    this._state = this._state.set(hexAddress, account);
  }

  public getContractCode(address: Address): Buffer {
    const localCode = this._state.get(address.toString())?.get("code");
    if (localCode !== undefined) {
      return toBuffer(localCode);
    }

    return toBuffer([]);
  }

  public getContractStorage(address: Address, key: Buffer): Buffer {
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

    return toBuffer([]);
  }

  public putContractStorage(
    address: Address,
    key: Buffer,
    value: Buffer
  ): void {
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

  public clearContractStorage(address: Address): void {
    const hexAddress = address.toString();
    let account = this._state.get(hexAddress) ?? makeAccountState();
    account = account
      .set("storageCleared", true)
      .set("storage", ImmutableMap<string, string | null>());
    this._state = this._state.set(hexAddress, account);
  }

  public checkpoint(): void {
    const stateRoot = this.getStateRoot();
    this._stateCheckpoints.push(bufferToHex(stateRoot));
  }

  public commit(): void {
    if (this._stateCheckpoints.length === 0) {
      throw notCheckpointedError("commit");
    }
    this._stateCheckpoints.pop();
  }

  public revert(): void {
    const checkpointedRoot = this._stateCheckpoints.pop();
    if (checkpointedRoot === undefined) {
      throw notCheckpointedError("revert");
    }
    this.setStateRoot(toBuffer(checkpointedRoot));
  }

  public getStateRoot(): Buffer {
    if (this._stateRootToState.get(this._stateRoot) !== this._state) {
      this._stateRoot = randomHash();
      this._stateRootToState.set(this._stateRoot, this._state);
    }
    return toBuffer(this._stateRoot);
  }

  public setStateRoot(stateRoot: Buffer): void {
    this._setStateRoot(stateRoot);
  }

  public dumpStorage(_address: Address): Record<string, string> {
    throw notSupportedError("dumpStorage");
  }

  public hasGenesisState(): boolean {
    throw notSupportedError("hasGenesisState");
  }

  public generateCanonicalGenesis(): void {
    throw notSupportedError("generateCanonicalGenesis");
  }

  public generateGenesis(_initState: any): void {
    throw notSupportedError("generateGenesis");
  }

  public accountIsEmpty(address: Address): boolean {
    const account = this.getAccount(address);
    // From https://eips.ethereum.org/EIPS/eip-161
    // An account is considered empty when it has no code and zero nonce and zero balance.
    return (
      account.nonce === 0n &&
      account.balance === 0n &&
      account.codeHash.equals(KECCAK256_NULL)
    );
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

    this._contextChanged = true;
    this._state = ImmutableMap<string, ImmutableRecord<AccountState>>();
    this._stateRoot = bufferToHex(stateRoot);
    this._stateRootToState.set(this._stateRoot, this._state);
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
    }
  }

  public accountExists(_address: Address): never {
    throw new InternalError(
      "Hardhat Network can't fork from networks running a hardfork older than Spurious Dragon"
    );
  }

  public deleteAccount(address: Address): void {
    // we set an empty account instead of deleting it to avoid
    // re-fetching the state from the remote node.
    // This is only valid post spurious dragon, but we don't support older hardforks when forking.
    const emptyAccount = makeEmptyAccountState();
    this._state = this._state.set(address.toString(), emptyAccount);
  }

  public clearOriginalStorageCache(): void {
    this._originalStorageCache = new Map();
  }

  public getOriginalContractStorage(address: Address, key: Buffer): Buffer {
    const storageKey = encodeStorageKey(address.toBuffer(), key);
    const cachedValue = this._originalStorageCache.get(storageKey);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const value = this.getContractStorage(address, key);
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

  public hasStateRoot(root: Buffer): boolean {
    return this._state.has(bufferToHex(root));
  }

  public flush(): void {
    // not implemented
  }

  public modifyAccountFields(address: Address, accountFields: any): void {
    // copied from BaseStateManager
    const account = this.getAccount(address);
    account.nonce = accountFields.nonce ?? account.nonce;
    account.balance = accountFields.balance ?? account.balance;
    account.storageRoot = accountFields.storageRoot ?? account.storageRoot;
    account.codeHash = accountFields.codeHash ?? account.codeHash;
    this.putAccount(address, account);
  }
}
