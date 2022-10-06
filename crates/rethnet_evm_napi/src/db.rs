use std::sync::mpsc::{channel, Sender};

use anyhow::anyhow;
use napi::Status;
use rethnet_evm::{
    AccountInfo, Bytecode, Database, DatabaseCommit, DatabaseDebug, H160, H256, U256,
};

use crate::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};

pub struct CommitCall {
    pub sender: Sender<napi::Result<()>>,
}

pub struct GetAccountByAddressCall {
    pub address: H160,
    pub sender: Sender<napi::Result<AccountInfo>>,
}

pub struct GetAccountStorageSlotCall {
    pub address: H160,
    pub index: U256,
    pub sender: Sender<napi::Result<U256>>,
}

pub struct GetStorageRootCall {
    pub sender: Sender<napi::Result<H256>>,
}

pub struct InsertAccountCall {
    pub address: H160,
    pub account_info: AccountInfo,
    pub sender: Sender<napi::Result<()>>,
}

pub struct SetAccountBalanceCall {
    pub address: H160,
    pub balance: U256,
    pub sender: Sender<napi::Result<()>>,
}

pub struct SetAccountCodeCall {
    pub address: H160,
    pub code: Bytecode,
    pub sender: Sender<napi::Result<()>>,
}

pub struct SetAccountNonceCall {
    pub address: H160,
    pub nonce: u64,
    pub sender: Sender<napi::Result<()>>,
}

pub struct SetAccountStorageSlotCall {
    pub address: H160,
    pub index: U256,
    pub value: U256,
    pub sender: Sender<napi::Result<()>>,
}

pub struct CheckpointCall {
    pub sender: Sender<napi::Result<()>>,
}

pub struct RevertCall {
    pub sender: Sender<napi::Result<()>>,
}

pub struct CallbackDatabase {
    commit_fn: ThreadsafeFunction<CommitCall>,
    checkpoint_fn: ThreadsafeFunction<CheckpointCall>,
    revert_fn: ThreadsafeFunction<RevertCall>,
    get_account_by_address_fn: ThreadsafeFunction<GetAccountByAddressCall>,
    get_account_storage_slot_fn: ThreadsafeFunction<GetAccountStorageSlotCall>,
    get_storage_root_fn: ThreadsafeFunction<GetStorageRootCall>,
    insert_account_fn: ThreadsafeFunction<InsertAccountCall>,
    set_account_balance_fn: ThreadsafeFunction<SetAccountBalanceCall>,
    set_account_code_fn: ThreadsafeFunction<SetAccountCodeCall>,
    set_account_nonce_fn: ThreadsafeFunction<SetAccountNonceCall>,
    set_account_storage_slot_fn: ThreadsafeFunction<SetAccountStorageSlotCall>,
}

impl CallbackDatabase {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        commit_fn: ThreadsafeFunction<CommitCall>,
        checkpoint_fn: ThreadsafeFunction<CheckpointCall>,
        revert_fn: ThreadsafeFunction<RevertCall>,
        get_account_by_address_fn: ThreadsafeFunction<GetAccountByAddressCall>,
        get_account_storage_slot_fn: ThreadsafeFunction<GetAccountStorageSlotCall>,
        get_storage_root: ThreadsafeFunction<GetStorageRootCall>,
        insert_account_fn: ThreadsafeFunction<InsertAccountCall>,
        set_account_balance_fn: ThreadsafeFunction<SetAccountBalanceCall>,
        set_account_code_fn: ThreadsafeFunction<SetAccountCodeCall>,
        set_account_nonce_fn: ThreadsafeFunction<SetAccountNonceCall>,
        set_account_storage_slot_fn: ThreadsafeFunction<SetAccountStorageSlotCall>,
    ) -> Self {
        Self {
            commit_fn,
            checkpoint_fn,
            revert_fn,
            get_account_by_address_fn,
            get_account_storage_slot_fn,
            get_storage_root_fn: get_storage_root,
            insert_account_fn,
            set_account_balance_fn,
            set_account_code_fn,
            set_account_nonce_fn,
            set_account_storage_slot_fn,
        }
    }
}

impl Database for CallbackDatabase {
    type Error = anyhow::Error;

    fn basic(&mut self, address: H160) -> anyhow::Result<Option<AccountInfo>> {
        let (sender, receiver) = channel();

        let status = self.get_account_by_address_fn.call(
            GetAccountByAddressCall { address, sender },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_or_else(
            |e| Err(anyhow!(e.to_string())),
            |account_info| Ok(Some(account_info)),
        )
    }

    fn code_by_hash(&mut self, _code_hash: H256) -> anyhow::Result<Bytecode> {
        todo!()
    }

    fn storage(&mut self, address: H160, index: U256) -> anyhow::Result<U256> {
        let (sender, receiver) = channel();

        let status = self.get_account_storage_slot_fn.call(
            GetAccountStorageSlotCall {
                address,
                index,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }

    fn block_hash(&mut self, _number: U256) -> anyhow::Result<H256> {
        todo!()
    }
}

impl DatabaseCommit for CallbackDatabase {
    fn commit(&mut self, _changes: rethnet_evm::HashMap<H160, rethnet_evm::Account>) {
        let (sender, receiver) = channel();

        let status = self
            .commit_fn
            .call(CommitCall { sender }, ThreadsafeFunctionCallMode::Blocking);
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().expect("Failed to commit")
    }
}

impl DatabaseDebug for CallbackDatabase {
    type Error = anyhow::Error;

    fn insert_account(
        &mut self,
        address: H160,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error> {
        let (sender, receiver) = channel();

        let status = self.insert_account_fn.call(
            InsertAccountCall {
                address,
                account_info,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }

    fn insert_block(&mut self, _block_number: U256, _block_hash: H256) -> Result<(), Self::Error> {
        todo!()
    }

    fn set_account_balance(&mut self, address: H160, balance: U256) -> Result<(), Self::Error> {
        let (sender, receiver) = channel();

        let status = self.set_account_balance_fn.call(
            SetAccountBalanceCall {
                address,
                balance,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }

    fn set_account_code(
        &mut self,
        address: H160,
        code: rethnet_evm::Bytecode,
    ) -> Result<(), Self::Error> {
        let (sender, receiver) = channel();

        let status = self.set_account_code_fn.call(
            SetAccountCodeCall {
                address,
                code,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }

    fn set_account_nonce(&mut self, address: H160, nonce: u64) -> Result<(), Self::Error> {
        let (sender, receiver) = channel();

        let status = self.set_account_nonce_fn.call(
            SetAccountNonceCall {
                address,
                nonce,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }

    fn set_account_storage_slot(
        &mut self,
        address: H160,
        index: U256,
        value: U256,
    ) -> Result<(), Self::Error> {
        let (sender, receiver) = channel();

        let status = self.set_account_storage_slot_fn.call(
            SetAccountStorageSlotCall {
                address,
                index,
                value,
                sender,
            },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }

    fn storage_root(&mut self) -> Result<H256, Self::Error> {
        let (sender, receiver) = channel();

        let status = self.get_storage_root_fn.call(
            GetStorageRootCall { sender },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }

    fn checkpoint(&mut self) -> Result<(), Self::Error> {
        let (sender, receiver) = channel();

        let status = self.checkpoint_fn.call(
            CheckpointCall { sender },
            ThreadsafeFunctionCallMode::Blocking,
        );
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }

    fn revert(&mut self) -> Result<(), Self::Error> {
        let (sender, receiver) = channel();

        let status = self
            .revert_fn
            .call(RevertCall { sender }, ThreadsafeFunctionCallMode::Blocking);
        assert_eq!(status, Status::Ok);

        receiver.recv().unwrap().map_err(|e| anyhow!(e.to_string()))
    }
}
