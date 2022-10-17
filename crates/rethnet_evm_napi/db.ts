import {
    StateManager,
} from "@nomicfoundation/ethereumjs-statemanager";
import { Account, Address, bigIntToBuffer, bufferToBigInt, setLengthLeft } from "@nomicfoundation/ethereumjs-util"
import { Account as RethnetAccount, Rethnet } from './'

export class HardhatDB {
    protected _stateManager: StateManager;

    constructor(stateManager: StateManager) {
        this._stateManager = stateManager;
    }

    public async commit() {
        return this._stateManager.commit();
    }

    public async checkpoint() {
        return this._stateManager.checkpoint();
    }

    public async revert() {
        return this._stateManager.revert();
    }

    public async getAccountByAddress(address: Buffer): Promise<RethnetAccount> {
        const account = await this._stateManager.getAccount(new Address(address));

        return {
            balance: account.balance,
            nonce: account.nonce,
            codeHash: account.codeHash,
        };
    }

    public async getAccountStorageSlot(address: Buffer, index: bigint): Promise<bigint> {
        const value = await this._stateManager.getContractStorage(
            new Address(address),
            setLengthLeft(bigIntToBuffer(index), 32));

        return bufferToBigInt(value);
    }

    public async getStorageRoot(): Promise<Buffer> {
        return this._stateManager.getStateRoot();
    }

    public async insertAccount(address: Buffer, account: RethnetAccount): Promise<void> {
        return this._stateManager.putAccount(new Address(address), new Account(account.nonce, account.balance, undefined, account.codeHash));
    }

    public async setAccountBalance(address: Buffer, balance: bigint) {
        return this._stateManager.modifyAccountFields(new Address(address), { balance });
    }

    public async setAccountCode(address: Buffer, code: Buffer) {
        return this._stateManager.putContractCode(new Address(address), code);
    }

    public async setAccountNonce(address: Buffer, nonce: bigint) {
        return this._stateManager.modifyAccountFields(new Address(address), { nonce })
    }

    public async setAccountStorageSlot(address: Buffer, index: bigint, value: bigint) {
        return this._stateManager.putContractStorage(
            new Address(address),
            setLengthLeft(bigIntToBuffer(index), 32),
            setLengthLeft(bigIntToBuffer(value), 32));
    }
}
