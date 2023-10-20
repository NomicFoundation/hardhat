import {
  Address,
  bufferToBigInt,
  toBuffer,
} from "@nomicfoundation/ethereumjs-util";
import { State, Account, Bytecode, Block, EdrContext } from "@ignored/edr";
import { ForkConfig, GenesisAccount } from "./node-types";
import { EdrIrregularState } from "./EdrIrregularState";

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */
/* eslint-disable @typescript-eslint/no-unused-vars */

export class EdrStateManager {
  constructor(private _state: State) {}

  public static withGenesisAccounts(
    genesisAccounts: GenesisAccount[]
  ): EdrStateManager {
    return new EdrStateManager(
      State.withGenesisAccounts(
        genesisAccounts.map((account) => {
          return {
            secretKey: account.privateKey,
            balance: BigInt(account.balance),
          };
        })
      )
    );
  }

  public static async forkRemote(
    context: EdrContext,
    forkConfig: ForkConfig,
    forkBlock: Block,
    irregularState: EdrIrregularState
  ): Promise<EdrStateManager> {
    // let blockNumber: bigint;
    // if (forkConfig.blockNumber !== undefined) {
    //   blockNumber = BigInt(forkConfig.blockNumber);
    // } else {
    //   const { forkBlockNumber } = await makeForkProvider(forkConfig);
    //   blockNumber = forkBlockNumber;
    // }

    return new EdrStateManager(
      await State.forkRemote(context, forkConfig.jsonRpcUrl, forkBlock)
      // TODO: consider changing State.withFork() to also support
      // passing in (and of course using) forkConfig.httpHeaders.
    );
  }

  public asInner(): State {
    return this._state;
  }

  public setInner(state: State): void {
    this._state = state;
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

  public async modifyAccount(
    address: Address,
    modifyAccountFn: (
      balance: bigint,
      nonce: bigint,
      code: Bytecode | undefined
    ) => Promise<Account>
  ): Promise<Account> {
    return this._state.modifyAccount(address.buf, modifyAccountFn);
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
    index: bigint,
    value: bigint
  ): Promise<bigint> {
    return this._state.setAccountStorageSlot(address.buf, index, value);
  }

  public async getStateRoot(): Promise<Buffer> {
    return this._state.getStateRoot();
  }

  public async serialize(): Promise<string> {
    return this._state.serialize();
  }
}
