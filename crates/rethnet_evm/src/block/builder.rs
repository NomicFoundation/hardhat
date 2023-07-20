use std::{
    fmt::Debug,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use rethnet_eth::{
    block::{Block, Header, PartialHeader},
    log::Log,
    receipt::{EIP658Receipt, TypedReceipt},
    transaction::SignedTransaction,
    trie::{ordered_trie_root, KECCAK_NULL_RLP},
    Address, Bloom, U256,
};
use revm::{
    db::DatabaseComponentError,
    primitives::{
        AccountInfo, BlockEnv, CfgEnv, EVMError, ExecutionResult, InvalidTransaction,
        ResultAndState, SpecId,
    },
};
use tokio::sync::RwLock;

use crate::{
    blockchain::SyncBlockchain,
    evm::{build_evm, run_transaction, SyncInspector},
    state::{AccountModifierFn, SyncState},
    BlockOptions, PendingTransaction,
};

use super::difficulty::calculate_ethash_canonical_difficulty;

/// Combined block and the callers of the transactions in the block
pub struct BlockAndCallers(pub Block, pub Vec<Address>);

#[derive(Debug, thiserror::Error)]
pub enum BlockBuilderError<SE> {
    /// Unsupported hardfork. Hardforks older than Byzantium are not supported
    #[error("Unsupported hardfork: {0:?}. Hardforks older than Byzantium are not supported.")]
    UnsupportedHardfork(SpecId),
    /// State error
    #[error(transparent)]
    State(#[from] SE),
}

/// Invalid transaction error while creating block.
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
    receipts: Vec<TypedReceipt>,
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
        parent: Header,
        options: BlockOptions,
    ) -> Result<Self, BlockBuilderError<SE>> {
        if cfg.spec_id < SpecId::BYZANTIUM {
            return Err(BlockBuilderError::UnsupportedHardfork(cfg.spec_id));
        }

        state.write().await.checkpoint()?;

        let timestamp = options.timestamp.unwrap_or_default();
        let number = options.number.unwrap_or(parent.number + U256::from(1));

        // TODO: Are all user values covered?
        let header = PartialHeader {
            parent_hash: options.parent_hash.unwrap_or_else(|| parent.hash()),
            beneficiary: options.beneficiary.unwrap_or_default(),
            state_root: options.state_root.unwrap_or(KECCAK_NULL_RLP),
            receipts_root: options.receipts_root.unwrap_or(KECCAK_NULL_RLP),
            logs_bloom: options.logs_bloom.unwrap_or_default(),
            difficulty: if cfg.spec_id < SpecId::MERGE {
                calculate_ethash_canonical_difficulty(&cfg, &parent, &number, &timestamp)
            } else {
                options.difficulty.unwrap_or_default()
            },
            number,
            gas_limit: options.gas_limit.unwrap_or(U256::from(1_000_000)),
            gas_used: U256::ZERO,
            timestamp,
            extra_data: options.extra_data.unwrap_or_default(),
            mix_hash: options.mix_hash.unwrap_or_default(),
            nonce: options.nonce.unwrap_or_default(),
            base_fee: options.base_fee.or_else(|| {
                if cfg.spec_id >= SpecId::LONDON {
                    Some(U256::from(7))
                } else {
                    None
                }
            }),
        };

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
            parent_gas_limit: if options.gas_limit.is_none() {
                Some(parent.gas_limit)
            } else {
                None
            },
        })
    }

    /// Retrieves the amount of gas used in the block, so far.
    pub fn gas_used(&self) -> U256 {
        self.header.gas_used
    }

    /// Retrieves the amount of gas left in the block.
    pub fn gas_remaining(&self) -> U256 {
        self.header.gas_limit - self.gas_used()
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
        if U256::from(transaction.transaction.gas_limit()) > self.gas_remaining() {
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
            logs.iter().for_each(|log| {
                log.add_to_bloom(&mut bloom);
            });
            bloom
        };

        let receipt = EIP658Receipt {
            status_code: if result.is_success() { 1 } else { 0 },
            gas_used: self.header.gas_used,
            logs_bloom,
            logs,
        };

        self.receipts.push(match &transaction.transaction {
            SignedTransaction::Legacy(_) => TypedReceipt::Legacy(receipt),
            SignedTransaction::EIP2930(_) => TypedReceipt::EIP2930(receipt),
            SignedTransaction::EIP1559(_) => TypedReceipt::EIP1559(receipt),
        });

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
    ) -> Result<BlockAndCallers, SE> {
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
                .map(|receipt| rlp::encode(receipt).freeze()),
        );

        if let Some(timestamp) = timestamp {
            self.header.timestamp = timestamp;
        } else if self.header.timestamp == Default::default() {
            self.header.timestamp = U256::from(
                SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .expect("Current time must be after unix epoch")
                    .as_secs(),
            );
        }

        // TODO: handle ommers
        let block = Block::new(self.header, self.transactions, vec![]);

        Ok(BlockAndCallers(block, self.callers))
    }

    /// Aborts building of the block, reverting all transactions in the process.
    pub async fn abort(self) -> Result<(), SE> {
        let mut state = self.state.write().await;
        state.revert()
    }
}
