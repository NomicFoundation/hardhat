import Account from "ethereumjs-account";
import { BN, stripZeros } from "ethereumjs-util";
import { Map as ImmutableMap, Record as ImmutableRecord } from "immutable";
import { callbackify } from "util";

import { JsonRpcClient } from "../../jsonrpc/client";

import { AccountState, makeAccount } from "./Account";
import { NotSupportedError } from "./errors";
import { randomHash } from "./random";
import { StateManager } from "./StateManager";

// TODO: figure out what errors we wanna throw
/* tslint:disable only-buidler-error */

type State = ImmutableMap<string, ImmutableRecord<AccountState>>;

const encodeStorageKey = (address: Buffer, position: Buffer): string => {
  return `${address.toString("hex")}${stripZeros(position).toString("hex")}`;
};

export class ForkStateManager {
  private _state: State = ImmutableMap();
  private _stateRoot: string = randomHash();
  private _stateRootToState: Map<string, State> = new Map();
  private _originalStorageCache: Map<string, Buffer> = new Map();

  constructor(
    private _jsonRpcClient: JsonRpcClient,
    private _forkBlockNumber: BN
  ) {
    this._state = ImmutableMap();
  }

  public copy(): ForkStateManager {
    throw new Error("Not implemented.");
  }

  public getAccount(address: Buffer): Promise<Account> {
    throw new Error("Not implemented.");
  }

  public putAccount(address: Buffer, account: Account): Promise<void> {
    throw new Error("Not implemented.");
  }

  public touchAccount(address: Buffer): void {
    throw new Error("Not implemented.");
  }

  public async putContractCode(address: Buffer, value: Buffer): Promise<void> {
    const hexAddress = address.toString("hex");
    const account = (this._state.get(hexAddress) ?? makeAccount()).set(
      "code",
      value.toString("hex")
    );
    this._state = this._state.set(hexAddress, account);
  }

  public async getContractCode(address: Buffer): Promise<Buffer> {
    const localCode = this._state.get(address.toString("hex"))?.get("code");
    if (localCode !== undefined) {
      return Buffer.from(localCode, "hex");
    }
    return this._jsonRpcClient.getCode(address, this._forkBlockNumber);
  }

  public async getContractStorage(
    address: Buffer,
    key: Buffer
  ): Promise<Buffer> {
    const account = this._state.get(address.toString("hex"));
    const cleared = account?.get("storageCleared") ?? false;
    const localValue = account?.get("storage").get(key.toString("hex"));
    if (localValue !== undefined) {
      return Buffer.from(localValue, "hex");
    }
    if (cleared) {
      return Buffer.from("0".repeat(64), "hex");
    }
    return this._jsonRpcClient.getStorageAt(
      address,
      key,
      this._forkBlockNumber
    );
  }

  public async getOriginalContractStorage(
    address: Buffer,
    key: Buffer
  ): Promise<Buffer> {
    const storageKey = encodeStorageKey(address, key);
    const cachedValue = this._originalStorageCache.get(storageKey);
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    const value = await this.getContractStorage(address, key);
    this._originalStorageCache.set(storageKey, value);
    return value;
  }

  public async putContractStorage(
    address: Buffer,
    key: Buffer,
    value: Buffer
  ): Promise<void> {
    const hexAddress = address.toString("hex");
    let account = this._state.get(hexAddress) ?? makeAccount();
    account = account.set(
      "storage",
      account.get("storage").set(key.toString("hex"), value.toString("hex"))
    );
    this._state = this._state.set(hexAddress, account);
  }

  public async clearContractStorage(address: Buffer): Promise<void> {
    const hexAddress = address.toString("hex");
    let account = this._state.get(hexAddress) ?? makeAccount();
    account = account
      .set("storageCleared", true)
      .set("storage", ImmutableMap());
    this._state = this._state.set(hexAddress, account);
  }

  public async checkpoint(): Promise<void> {
    throw new NotSupportedError("checkpoint");
  }

  public async commit(): Promise<void> {
    throw new NotSupportedError("commit");
  }

  public async revert(): Promise<void> {
    throw new NotSupportedError("revert");
  }

  public async getStateRoot(): Promise<Buffer> {
    if (this._stateRootToState.get(this._stateRoot) !== this._state) {
      this._stateRoot = randomHash();
      this._stateRootToState.set(this._stateRoot, this._state);
    }
    return Buffer.from(this._stateRoot, "hex");
  }

  public async setStateRoot(stateRoot: Buffer): Promise<void> {
    const newRoot = stateRoot.toString("hex");
    const state = this._stateRootToState.get(newRoot);
    if (state === undefined) {
      throw new Error("Unknown state root");
    }
    this._stateRoot = newRoot;
    this._state = state;
  }

  public async dumpStorage(address: Buffer): Promise<Record<string, string>> {
    throw new NotSupportedError("dumpStorage");
  }

  public hasGenesisState(): Promise<boolean> {
    throw new Error("Not implemented.");
  }

  public generateCanonicalGenesis(): Promise<void> {
    throw new Error("Not implemented.");
  }

  public generateGenesis(initState: any): Promise<void> {
    throw new Error("Not implemented.");
  }

  public accountIsEmpty(address: Buffer): Promise<boolean> {
    throw new Error("Not implemented.");
  }

  public cleanupTouchedAccounts(): Promise<void> {
    throw new Error("Not implemented.");
  }

  // NOTE: this method is PUBLIC despite the naming convention of buidler
  public _clearOriginalStorageCache(): void {
    this._originalStorageCache = new Map();
  }

  public asStateManager(): StateManager {
    return {
      copy: () => this.copy().asStateManager(),
      getAccount: callbackify(this.getAccount.bind(this)),
      putAccount: callbackify(this.putAccount.bind(this)),
      touchAccount: this.touchAccount.bind(this),
      putContractCode: callbackify(this.putContractCode.bind(this)),
      getContractCode: callbackify(this.getContractCode.bind(this)),
      getContractStorage: callbackify(this.getContractStorage.bind(this)),
      getOriginalContractStorage: callbackify(
        this.getOriginalContractStorage.bind(this)
      ),
      putContractStorage: callbackify(this.putContractStorage.bind(this)),
      clearContractStorage: callbackify(this.clearContractStorage.bind(this)),
      checkpoint: callbackify(this.checkpoint.bind(this)),
      commit: callbackify(this.commit.bind(this)),
      revert: callbackify(this.revert.bind(this)),
      getStateRoot: callbackify(this.getStateRoot.bind(this)),
      setStateRoot: callbackify(this.setStateRoot.bind(this)),
      dumpStorage: callbackify(this.dumpStorage.bind(this)),
      hasGenesisState: callbackify(this.hasGenesisState.bind(this)),
      generateCanonicalGenesis: callbackify(
        this.generateCanonicalGenesis.bind(this)
      ),
      generateGenesis: callbackify(this.generateGenesis.bind(this)),
      accountIsEmpty: callbackify(this.accountIsEmpty.bind(this)),
      cleanupTouchedAccounts: callbackify(
        this.cleanupTouchedAccounts.bind(this)
      ),
      _clearOriginalStorageCache: this._clearOriginalStorageCache.bind(this),
    };
  }
}
