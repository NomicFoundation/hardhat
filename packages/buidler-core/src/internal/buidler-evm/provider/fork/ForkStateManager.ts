import Account from "ethereumjs-account";
import { BN, keccak256, KECCAK256_NULL_S, stripZeros } from "ethereumjs-util";
import { Map as ImmutableMap, Record as ImmutableRecord } from "immutable";
import { callbackify } from "util";

import { JsonRpcClient } from "../../jsonrpc/client";

import { AccountState, makeAccount } from "./Account";
import { CheckpointError, NotSupportedError } from "./errors";
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
  private _stateCheckpoints: string[] = [];

  constructor(
    private _jsonRpcClient: JsonRpcClient,
    private _forkBlockNumber: BN
  ) {
    this._state = ImmutableMap();
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

  public async getAccount(address: Buffer): Promise<Account> {
    const localAccount = this._state.get(address.toString("hex"));

    const localNonce = localAccount?.get("nonce");
    const localBalance = localAccount?.get("balance");
    const localCode = localAccount?.get("code");

    const nonce =
      localNonce !== undefined
        ? Buffer.from(localNonce, "hex")
        : await this._jsonRpcClient.getTransactionCount(
            address,
            this._forkBlockNumber
          );
    const balance =
      localBalance !== undefined
        ? Buffer.from(localBalance, "hex")
        : await this._jsonRpcClient.getBalance(address, this._forkBlockNumber);
    const code =
      localCode !== undefined
        ? Buffer.from(localCode, "hex")
        : await this._jsonRpcClient.getCode(address, this._forkBlockNumber);

    const codeHash = keccak256(code);
    // We ignore stateRoot since we found that it is not used anywhere of interest to us
    return new Account({ nonce, balance, codeHash });
  }

  public async putAccount(address: Buffer, account: Account): Promise<void> {
    // Because the vm only ever modifies the nonce and the balance using this
    // method we ignore the other properties
    const hexAddress = address.toString("hex");
    let localAccount = this._state.get(hexAddress) ?? makeAccount();
    localAccount = localAccount
      .set("nonce", account.nonce.toString("hex"))
      .set("balance", account.balance.toString("hex"));
    this._state = this._state.set(hexAddress, localAccount);
  }

  public touchAccount(address: Buffer): void {
    // We don't do anything here. See cleanupTouchedAccounts for explanation
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
    const stateRoot = await this.getStateRoot();
    this._stateCheckpoints.push(stateRoot.toString("hex"));
  }

  public async commit(): Promise<void> {
    if (this._stateCheckpoints.length === 0) {
      throw new CheckpointError("commit");
    }
    this._stateCheckpoints.pop();
  }

  public async revert(): Promise<void> {
    const checkpointedRoot = this._stateCheckpoints.pop();
    if (checkpointedRoot === undefined) {
      throw new CheckpointError("revert");
    }
    await this.setStateRoot(Buffer.from(checkpointedRoot, "hex"));
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

  public async hasGenesisState(): Promise<boolean> {
    throw new NotSupportedError("hasGenesisState");
  }

  public async generateCanonicalGenesis(): Promise<void> {
    throw new NotSupportedError("generateCanonicalGenesis");
  }

  public async generateGenesis(initState: any): Promise<void> {
    throw new NotSupportedError("generateGenesis");
  }

  public async accountIsEmpty(address: Buffer): Promise<boolean> {
    const account = await this.getAccount(address);
    // From https://eips.ethereum.org/EIPS/eip-161
    // An account is considered empty when it has no code and zero nonce and zero balance.
    return (
      new BN(account.nonce).eqn(0) &&
      new BN(account.balance).eqn(0) &&
      account.codeHash.toString("hex") === KECCAK256_NULL_S
    );
  }

  public async cleanupTouchedAccounts(): Promise<void> {
    // We do not do anything here, because cleaning accounts only affects the
    // stateRoot. Since the stateRoot is fake anyway there is no need to
    // perform this operation.
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
