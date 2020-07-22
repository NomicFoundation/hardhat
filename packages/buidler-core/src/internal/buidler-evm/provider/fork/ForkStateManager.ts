import Account from "ethereumjs-account";
import { BN } from "ethereumjs-util";
import { callbackify } from "util";

import { JsonRpcClient } from "../../jsonrpc/client";

import { StateManager } from "./StateManager";

// TODO: figure out what errors we wanna throw
/* tslint:disable only-buidler-error */

export class ForkStateManager {
  private _contractCode = new Map<string, Buffer>();

  constructor(
    private _jsonRpcClient: JsonRpcClient,
    private _forkBlockNumber: BN
  ) {}

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
    this._contractCode.set(address.toString("hex"), value);
  }

  public async getContractCode(address: Buffer): Promise<Buffer> {
    const localCode = this._contractCode.get(address.toString("hex"));
    if (localCode !== undefined) {
      return localCode;
    }
    return this._jsonRpcClient.getCode(address, this._forkBlockNumber);
  }

  public getContractStorage(address: Buffer, key: Buffer): Promise<Buffer> {
    throw new Error("Not implemented.");
  }

  public getOriginalContractStorage(
    address: Buffer,
    key: Buffer
  ): Promise<Buffer> {
    throw new Error("Not implemented.");
  }

  public putContractStorage(
    address: Buffer,
    key: Buffer,
    value: Buffer
  ): Promise<void> {
    throw new Error("Not implemented.");
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
