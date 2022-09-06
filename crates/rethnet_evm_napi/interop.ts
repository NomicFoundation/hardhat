import {
    DefaultStateManager,
    StateManager,
} from "@nomicfoundation/ethereumjs-statemanager";
import { Address } from "@nomicfoundation/ethereumjs-util"
import { Account } from './rethnet-evm'

export class HardhatDB {
    protected _stateManager: StateManager;

    constructor(stateManager: StateManager) {
        this._stateManager = stateManager;
    }

    public async get_account_by_address(address: Buffer): Promise<Account> {
        return this._stateManager.getAccount(new Address(address));
    }
}
