import Account from "ethereumjs-account";

import { Callback } from "./Callback";

/**
 * This is similar to the definition from the vm, but is an interface, not a
 * class and has strict types for callbacks, making it more explicit and safer
 * to use.
 */
export interface StateManager {
  /**
   * Copies the current instance of the `StateManager`
   * at the last fully committed point, i.e. as if all current
   * checkpoints were reverted.
   */
  copy(): StateManager;
  /**
   * Callback for `getAccount` method.
   * @callback getAccount~callback
   * @param error - an error that may have happened or `null`
   * @param account - An [`ethereumjs-account`](https://github.com/ethereumjs/ethereumjs-account)
   * instance corresponding to the provided `address`
   */
  /**
   * Gets the [`ethereumjs-account`](https://github.com/ethereumjs/ethereumjs-account)
   * associated with `address`. Returns an empty account if the account does not exist.
   * @param address - Address of the `account` to get
   * @param {getAccount~callback} cb
   */
  getAccount(address: Buffer, cb: Callback<Account>): void;
  /**
   * Saves an [`ethereumjs-account`](https://github.com/ethereumjs/ethereumjs-account)
   * into state under the provided `address`.
   * @param address - Address under which to store `account`
   * @param account - The [`ethereumjs-account`](https://github.com/ethereumjs/ethereumjs-account) to store
   * @param cb - Callback function
   */
  putAccount(address: Buffer, account: Account, cb: Callback): void;
  /**
   * Marks an account as touched, according to the definition
   * in [EIP-158](https://github.com/ethereum/EIPs/issues/158).
   * This happens when the account is triggered for a state-changing
   * event. Touched accounts that are empty will be cleared
   * at the end of the tx.
   */
  touchAccount(address: Buffer): void;
  /**
   * Adds `value` to the state trie as code, and sets `codeHash` on the account
   * corresponding to `address` to reference this.
   * @param address - Address of the `account` to add the `code` for
   * @param value - The value of the `code`
   * @param cb - Callback function
   */
  putContractCode(address: Buffer, value: Buffer, cb: Callback): void;
  /**
   * Callback for `getContractCode` method
   * @callback getContractCode~callback
   * @param error - an error that may have happened or `null`
   * @param code - The code corresponding to the provided address.
   * Returns an empty `Buffer` if the account has no associated code.
   */
  /**
   * Gets the code corresponding to the provided `address`.
   * @param address - Address to get the `code` for
   * @param {getContractCode~callback} cb
   */
  getContractCode(address: Buffer, cb: Callback<Buffer>): void;
  /**
   * Callback for `getContractStorage` method
   * @callback getContractStorage~callback
   * @param {Error} error an error that may have happened or `null`
   * @param {Buffer} storageValue The storage value for the account
   * corresponding to the provided address at the provided key.
   * If this does not exists an empty `Buffer` is returned
   */
  /**
   * Gets the storage value associated with the provided `address` and `key`. This method returns
   * the shortest representation of the stored value.
   * @param address -  Address of the account to get the storage for
   * @param key - Key in the account's storage to get the value for. Must be 32 bytes long.
   * @param {getContractCode~callback} cb.
   */
  getContractStorage(address: Buffer, key: Buffer, cb: Callback<Buffer>): void;
  /**
   * Caches the storage value associated with the provided `address` and `key`
   * on first invocation, and returns the cached (original) value from then
   * onwards. This is used to get the original value of a storage slot for
   * computing gas costs according to EIP-1283.
   * @param address - Address of the account to get the storage for
   * @param key - Key in the account's storage to get the value for. Must be 32 bytes long.
   * @param cb - Callback function
   */
  getOriginalContractStorage(
    address: Buffer,
    key: Buffer,
    cb: Callback<Buffer>
  ): void;
  /**
   * Adds value to the state trie for the `account`
   * corresponding to `address` at the provided `key`.
   * @param address -  Address to set a storage value for
   * @param key - Key to set the value at. Must be 32 bytes long.
   * @param value - Value to set at `key` for account corresponding to `address`
   * @param cb - Callback function
   */
  putContractStorage(
    address: Buffer,
    key: Buffer,
    value: Buffer,
    cb: Callback
  ): void;
  /**
   * Clears all storage entries for the account corresponding to `address`.
   * @param address -  Address to clear the storage of
   * @param cb - Callback function
   */
  clearContractStorage(address: Buffer, cb: Callback): void;
  /**
   * Checkpoints the current state of the StateManager instance.
   * State changes that follow can then be committed by calling
   * `commit` or `reverted` by calling rollback.
   * @param cb - Callback function
   */
  checkpoint(cb: Callback): void;
  /**
   * Commits the current change-set to the instance since the
   * last call to checkpoint.
   * @param cb - Callback function
   */
  commit(cb: Callback): void;
  /**
   * Reverts the current change-set to the instance since the
   * last call to checkpoint.
   * @param cb - Callback function
   */
  revert(cb: Callback): void;
  /**
   * Callback for `getStateRoot` method
   * @callback getStateRoot~callback
   * @param {Error} error an error that may have happened or `null`.
   * Will be an error if the un-committed checkpoints on the instance.
   * @param {Buffer} stateRoot The state-root of the `StateManager`
   */
  /**
   * Gets the state-root of the Merkle-Patricia trie representation
   * of the state of this StateManager. Will error if there are uncommitted
   * checkpoints on the instance.
   * @param {getStateRoot~callback} cb
   */
  getStateRoot(cb: Callback<Buffer>): void;
  /**
   * Sets the state of the instance to that represented
   * by the provided `stateRoot`. Will error if there are uncommitted
   * checkpoints on the instance or if the state root does not exist in
   * the state trie.
   * @param stateRoot - The state-root to reset the instance to
   * @param cb - Callback function
   */
  setStateRoot(stateRoot: Buffer, cb: Callback): void;
  /**
   * Callback for `dumpStorage` method
   * @callback dumpStorage~callback
   * @param {Error} error an error that may have happened or `null`
   * @param {Object} accountState The state of the account as an `Object` map.
   * Keys are are the storage keys, values are the storage values as strings.
   * Both are represented as hex strings without the `0x` prefix.
   */
  /**
   * Dumps the the storage values for an `account` specified by `address`.
   * @param address - The address of the `account` to return storage for
   * @param {dumpStorage~callback} cb
   */
  dumpStorage(address: Buffer, cb: Callback<Record<string, string>>): void;
  /**
   * Callback for `hasGenesisState` method
   * @callback hasGenesisState~callback
   * @param {Error} error an error that may have happened or `null`
   * @param {Boolean} hasGenesisState Whether the storage trie contains the
   * canonical genesis state for the configured chain parameters.
   */
  /**
   * Checks whether the current instance has the canonical genesis state
   * for the configured chain parameters.
   * @param {hasGenesisState~callback} cb
   */
  hasGenesisState(cb: Callback<boolean>): void;
  /**
   * Generates a canonical genesis state on the instance based on the
   * configured chain parameters. Will error if there are uncommitted
   * checkpoints on the instance.
   * @param cb - Callback function
   */
  generateCanonicalGenesis(cb: Callback): void;
  /**
   * Initializes the provided genesis state into the state trie
   * @param initState - Object (address -> balance)
   * @param cb - Callback function
   */
  generateGenesis(initState: any, cb: Callback): void;
  /**
   * Callback for `accountIsEmpty` method
   * @callback accountIsEmpty~callback
   * @param {Error} error an error that may have happened or `null`
   * @param {Boolean} empty True if the account is empty false otherwise
   */
  /**
   * Checks if the `account` corresponding to `address` is empty as defined in
   * EIP-161 (https://github.com/ethereum/EIPs/blob/master/EIPS/eip-161.md).
   * @param address - Address to check
   * @param {accountIsEmpty~callback} cb
   */
  accountIsEmpty(address: Buffer, cb: Callback<boolean>): void;
  /**
   * Removes accounts form the state trie that have been touched,
   * as defined in EIP-161 (https://github.com/ethereum/EIPs/blob/master/EIPS/eip-161.md).
   * @param cb - Callback function
   */
  cleanupTouchedAccounts(cb: Callback): void;
  /**
   * Clears the original storage cache. Refer to [[getOriginalContractStorage]]
   * for more explanation.
   * @ignore
   */
  _clearOriginalStorageCache(): void;
}
