use std::{
    fmt::Debug,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use rethnet_eth::{
    block::{Block, BlockOptions, DetailedBlock, Header, PartialHeader},
    log::Log,
    receipt::{TransactionReceipt, TypedReceipt, TypedReceiptData},
    transaction::SignedTransaction,
    trie::ordered_trie_root,
    Address, Bloom, U256,
};
use revm::{
    db::DatabaseComponentError,
    primitives::{
        AccountInfo, BlockEnv, CfgEnv, EVMError, ExecutionResult, InvalidTransaction, Output,
        ResultAndState, SpecId,
    },
};
use tokio::sync::{RwLock, RwLockReadGuard};

use crate::{
    blockchain::SyncBlockchain,
    evm::{build_evm, run_transaction, SyncInspector},
    state::{AccountModifierFn, SyncState},
    PendingTransaction,
};

/// An error caused during construction of a block builder.
#[derive(Debug, thiserror::Error)]
pub enum BlockBuilderCreationError<SE> {
    /// Unsupported hardfork. Hardforks older than Byzantium are not supported
    #[error("Unsupported hardfork: {0:?}. Hardforks older than Byzantium are not supported.")]
    UnsupportedHardfork(SpecId),
    /// State error
    #[error(transparent)]
    State(#[from] SE),
}

/// An error caused during execution of a transaction while building a block.
#[derive(Debug, thiserror::Error)]
pub enum BlockTransactionError<BE, SE> {
    /// Blockchain errors
    #[error(transparent)]
    BlockHash(BE),
    /// Transaction has higher gas limit than is remaining in block
    #[error("Transaction has a higher gas limit than the remaining gas in the block")]
    ExceedsBlockGasLimit,
    /// Corrupt transaction data
    #[error("Invalid transaction: {0:?}")]
    InvalidTransaction(InvalidTransaction),
    /// State errors
    #[error(transparent)]
    State(SE),
}

impl<BE, SE> From<EVMError<DatabaseComponentError<SE, BE>>> for BlockTransactionError<BE, SE>
where
    BE: Debug + Send + 'static,
    SE: Debug + Send + 'static,
{
    fn from(error: EVMError<DatabaseComponentError<SE, BE>>) -> Self {
        match error {
            EVMError::Transaction(e) => Self::InvalidTransaction(e),
            EVMError::PrevrandaoNotSet => unreachable!(),
            EVMError::Database(DatabaseComponentError::State(e)) => Self::State(e),
            EVMError::Database(DatabaseComponentError::BlockHash(e)) => Self::BlockHash(e),
        }
    }
}

/// A builder for constructing Ethereum blocks.
pub struct BlockBuilder<BE, SE>
where
    BE: Debug + Send + 'static,
    SE: Debug + Send + 'static,
{
    blockchain: Arc<RwLock<dyn SyncBlockchain<BE>>>,
    state: Arc<RwLock<dyn SyncState<SE>>>,
    cfg: CfgEnv,
    header: PartialHeader,
    callers: Vec<Address>,
    transactions: Vec<SignedTransaction>,
    receipts: Vec<TransactionReceipt<Log>>,
    parent_gas_limit: Option<U256>,
}

impl<BE, SE> BlockBuilder<BE, SE>
where
    BE: Debug + Send + 'static,
    SE: Debug + Send + 'static,
{
    /// Creates an intance of [`BlockBuilder`], creating a checkpoint in the process.
    pub async fn new(
        blockchain: Arc<RwLock<dyn SyncBlockchain<BE>>>,
        state: Arc<RwLock<dyn SyncState<SE>>>,
        cfg: CfgEnv,
        parent: &Header,
        options: BlockOptions,
    ) -> Result<Self, BlockBuilderCreationError<SE>> {
        if cfg.spec_id < SpecId::BYZANTIUM {
            return Err(BlockBuilderCreationError::UnsupportedHardfork(cfg.spec_id));
        }

        state.write().await.checkpoint()?;

        let parent_gas_limit = if options.gas_limit.is_none() {
            Some(parent.gas_limit)
        } else {
            None
        };

        let header = PartialHeader::new(cfg.spec_id, options, Some(parent));

        // TODO: Validate DAO extra data
        // if (this._common.hardforkIsActiveOnBlock(Hardfork.Dao, this.number) === false) {
        //     return
        // }
        // const DAOActivationBlock = this._common.hardforkBlock(Hardfork.Dao)
        // if (DAOActivationBlock === null || this.number < DAOActivationBlock) {
        //     return
        // }
        // const DAO_ExtraData = Buffer.from('64616f2d686172642d666f726b', 'hex')
        // const DAO_ForceExtraDataRange = BigInt(9)
        // const drift = this.number - DAOActivationBlock
        // if (drift <= DAO_ForceExtraDataRange && !this.extraData.equals(DAO_ExtraData)) {
        //     const msg = this._errorMsg("extraData should be 'dao-hard-fork'")
        //     throw new Error(msg)
        // }

        Ok(Self {
            blockchain,
            state,
            cfg,
            header,
            callers: Vec::new(),
            transactions: Vec::new(),
            receipts: Vec::new(),
            parent_gas_limit,
        })
    }

    /// Retrieves the config of the block builder.
    pub fn config(&self) -> &CfgEnv {
        &self.cfg
    }

    /// Retrieves the amount of gas used in the block, so far.
    pub fn gas_used(&self) -> U256 {
        self.header.gas_used
    }

    /// Retrieves the amount of gas left in the block.
    pub fn gas_remaining(&self) -> U256 {
        self.header.gas_limit - self.gas_used()
    }

    /// Retrieves the instance's state.
    pub async fn state(&self) -> RwLockReadGuard<'_, dyn SyncState<SE>> {
        self.state.read().await
    }

    // fn miner_reward(num_ommers: u64) -> U256 {
    //     // TODO: This is the LONDON block reward. Did it change?
    //     const BLOCK_REWARD: u64 = 2 * 10u64.pow(18);
    //     const NIBLING_REWARD: u64 = BLOCK_REWARD / 32;

    //     U256::from(BLOCK_REWARD + num_ommers * NIBLING_REWARD)
    // }

    /// Adds a pending transaction to
    pub async fn add_transaction(
        &mut self,
        transaction: PendingTransaction,
        inspector: Option<&mut dyn SyncInspector<BE, SE>>,
    ) -> Result<ExecutionResult, BlockTransactionError<BE, SE>> {
        //  transaction's gas limit cannot be greater than the remaining gas in the block
        if U256::from(transaction.gas_limit()) > self.gas_remaining() {
            return Err(BlockTransactionError::ExceedsBlockGasLimit);
        }

        let block = BlockEnv {
            number: self.header.number,
            coinbase: self.header.beneficiary,
            timestamp: self.header.timestamp,
            difficulty: self.header.difficulty,
            basefee: self.header.base_fee.unwrap_or(U256::ZERO),
            gas_limit: self.header.gas_limit,
            prevrandao: if self.cfg.spec_id >= SpecId::MERGE {
                Some(self.header.mix_hash)
            } else {
                None
            },
        };

        let mut state = self.state.write().await;
        let blockchain = self.blockchain.read().await;

        let evm = build_evm(
            &*blockchain,
            &*state,
            self.cfg.clone(),
            transaction.clone().into(),
            block.clone(),
        );

        let ResultAndState {
            result,
            state: changes,
        } = run_transaction(evm, inspector)?;

        state.commit(changes);

        self.header.gas_used += U256::from(result.gas_used());

        let logs: Vec<Log> = result.logs().into_iter().map(Log::from).collect();
        let logs_bloom = {
            let mut bloom = Bloom::zero();
            for log in &logs {
                log.add_to_bloom(&mut bloom);
            }
            bloom
        };

        let status = u8::from(result.is_success());
        let contract_address = if let ExecutionResult::Success {
            output: Output::Create(_, address),
            ..
        } = &result
        {
            *address
        } else {
            None
        };

        let gas_price = transaction.gas_price();
        let effective_gas_price = if let SignedTransaction::EIP1559(transaction) = &*transaction {
            block.basefee + (gas_price - block.basefee).min(transaction.max_priority_fee_per_gas)
        } else {
            gas_price
        };

        let receipt = TransactionReceipt {
            inner: TypedReceipt {
                cumulative_gas_used: self.header.gas_used,
                logs_bloom,
                logs,
                data: match &*transaction {
                    SignedTransaction::Legacy(_) => {
                        TypedReceiptData::PostByzantiumLegacy { status }
                    }
                    SignedTransaction::EIP2930(_) => TypedReceiptData::EIP2930 { status },
                    SignedTransaction::EIP1559(_) => TypedReceiptData::EIP1559 { status },
                },
            },
            transaction_hash: *transaction.hash(),
            transaction_index: self.transactions.len() as u64,
            from: *transaction.caller(),
            to: transaction.to().cloned(),
            contract_address,
            gas_used: U256::from(result.gas_used()),
            effective_gas_price,
        };
        self.receipts.push(receipt);

        let (transaction, caller) = transaction.into_inner();

        self.callers.push(caller);
        self.transactions.push(transaction);

        Ok(result)
    }

    /// Finalizes the block, returning the block and the callers of the transactions.
    pub async fn finalize(
        mut self,
        rewards: Vec<(Address, U256)>,
        timestamp: Option<U256>,
    ) -> Result<DetailedBlock, SE> {
        let mut state = self.state.write().await;
        for (address, reward) in rewards {
            state
                .modify_account(
                    address,
                    AccountModifierFn::new(Box::new(move |balance, _nonce, _code| {
                        *balance += reward;
                    })),
                    &|| {
                        Ok(AccountInfo {
                            code: None,
                            ..AccountInfo::default()
                        })
                    },
                )
                .or_else(|error| {
                    state.revert()?;

                    Err(error)
                })?;
        }

        if let Some(gas_limit) = self.parent_gas_limit {
            self.header.gas_limit = gas_limit;
        }

        self.header.state_root = state
            .state_root()
            .expect("Must be able to calculate state root");

        self.header.logs_bloom = {
            let mut logs_bloom = Bloom::zero();
            self.receipts.iter().for_each(|receipt| {
                logs_bloom.accrue_bloom(receipt.logs_bloom());
            });
            logs_bloom
        };

        self.header.receipts_root = ordered_trie_root(
            self.receipts
                .iter()
                .map(|receipt| rlp::encode(&**receipt).freeze()),
        );

        if let Some(timestamp) = timestamp {
            self.header.timestamp = timestamp;
        } else if self.header.timestamp == U256::ZERO {
            self.header.timestamp = U256::from(
                SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .expect("Current time must be after unix epoch")
                    .as_secs(),
            );
        }

        // TODO: handle ommers
        let block = Block::new(self.header, self.transactions, vec![]);

        Ok(DetailedBlock::with_partial_receipts(
            block,
            self.callers,
            self.receipts,
        ))
    }

    /// Aborts building of the block, reverting all transactions in the process.
    pub async fn abort(self) -> Result<(), SE> {
        let mut state = self.state.write().await;
        state.revert()
    }
}
