import Account from "ethereumjs-account";
import { BN } from "ethereumjs-util";
import { Map as ImmutableMap, Record as ImmutableRecord } from "immutable";
import { callbackify } from "util";

import { JsonRpcClient } from "../../jsonrpc/client";

import { StateManager } from "./StateManager";

// TODO: figure out what errors we wanna throw
/* tslint:disable only-buidler-error */

interface AccountState {
  nonce: string;
  balance: string;
  storage: ImmutableMap<string, string>;
  code: string;
}

const makeAccount = ImmutableRecord<AccountState>({
  nonce: "0",
  balance: "0",
  storage: ImmutableMap(),
  code: "",
});

type State = ImmutableMap<string, ImmutableRecord<AccountState>>;

const randomHash = () => new Array(64).fill(0).map(randomHexDigit).join("");
const randomHexDigit = () => Math.floor(Math.random() * 16).toString(16);

export class ForkStateManager {
  private _state: State = ImmutableMap();
  private _stateRoot: string = randomHash();
  private _stateRootToState: Map<string, State> = new Map();

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
    const localValue = this._state
      .get(address.toString("hex"))
      ?.get("storage")
      .get(key.toString("hex"));
    if (localValue !== undefined) {
      return Buffer.from(localValue, "hex");
    }
    return this._jsonRpcClient.getStorageAt(
      address,
      key,
      this._forkBlockNumber
    );
  }

  public getOriginalContractStorage(
    address: Buffer,
    key: Buffer
  ): Promise<Buffer> {
    throw new Error("Not implemented.");
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

  public clearContractStorage(address: Buffer): Promise<void> {
    throw new Error("Not implemented.");
  }

  public checkpoint(): Promise<void> {
    throw new Error("Not implemented.");
  }

  public commit(): Promise<void> {
    throw new Error("Not implemented.");
  }

  public revert(): Promise<void> {
    throw new Error("Not implemented.");
  }

  public getStateRoot(): Promise<Buffer> {
    throw new Error("Not implemented.");
  }

  public setStateRoot(stateRoot: Buffer): Promise<void> {
    throw new Error("Not implemented.");
  }

  public dumpStorage(address: Buffer): Promise<Record<string, string>> {
    throw new Error("Not implemented.");
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
    throw new Error("Not implemented.");
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
