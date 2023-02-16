import {
  Address,
  bufferToBigInt,
  toBuffer,
} from "@nomicfoundation/ethereumjs-util";
import { StateManager, Account, Bytecode } from "rethnet-evm";
import { GenesisAccount } from "./node-types";

/* eslint-disable @nomiclabs/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/no-unused-vars */

export class RethnetStateManager {
  constructor(private _state: StateManager = new StateManager()) {}

  public static withGenesisAccounts(
    genesisAccounts: GenesisAccount[]
  ): RethnetStateManager {
    return new RethnetStateManager(
      StateManager.withGenesisAccounts(
        genesisAccounts.map((account) => {
          return {
            privateKey: account.privateKey,
            balance: BigInt(account.balance),
          };
        })
      )
    );
  }

  public asInner(): StateManager {
    return this._state;
  }

  public async accountExists(address: Address): Promise<boolean> {
    const account = await this._state.getAccountByAddress(address.buf);
    return account !== null;
  }

  public async getAccount(address: Address): Promise<Account | null> {
    return this._state.getAccountByAddress(address.buf);
  }

  public async getAccountStorageRoot(address: Address): Promise<Buffer | null> {
    return this._state.getAccountStorageRoot(address.buf);
  }

  public async accountIsEmpty(address: Address): Promise<boolean> {
    const account = await this._state.getAccountByAddress(address.buf);
    return (
      account === null ||
      (account.balance === 0n &&
        account.nonce === 0n &&
        account.code === undefined)
    );
  }

  public async deleteAccount(address: Address): Promise<void> {
    await this._state.removeAccount(address.buf);
  }

  public async makeSnapshot(): Promise<Buffer> {
    return this._state.makeSnapshot();
  }

  public async modifyAccount(
    address: Address,
    modifyAccountFn: (
      balance: bigint,
      nonce: bigint,
      code: Bytecode | undefined
    ) => Promise<Account>
  ): Promise<void> {
    await this._state.modifyAccount(address.buf, modifyAccountFn);
  }

  public async getContractCode(address: Address): Promise<Buffer> {
    const account = await this._state.getAccountByAddress(address.buf);
    if (account === null) {
      return Buffer.allocUnsafe(0);
    }

    if (account.code !== undefined) {
      return account.code.code;
    }

    return Buffer.from([]);
  }

  public async getContractStorage(
    address: Address,
    key: Buffer
  ): Promise<Buffer> {
    const index = bufferToBigInt(key);

    const value = await this._state.getAccountStorageSlot(address.buf, index);
    return toBuffer(value);
  }

  public async putContractStorage(
    address: Address,
    key: Buffer,
    value: Buffer
  ): Promise<void> {
    const index = bufferToBigInt(key);
    const number = bufferToBigInt(value);

    await this._state.setAccountStorageSlot(address.buf, index, number);
  }

  public async checkpoint(): Promise<void> {
    return this._state.checkpoint();
  }

  public async commit(): Promise<void> {}

  public async revert(): Promise<void> {
    return this._state.revert();
  }

  public async getStateRoot(): Promise<Buffer> {
    return this._state.getStateRoot();
  }

  public async setStateRoot(stateRoot: Buffer): Promise<void> {
    return this._state.setStateRoot(stateRoot);
  }
}
