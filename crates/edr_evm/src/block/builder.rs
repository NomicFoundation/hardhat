use std::{
    fmt::Debug,
    time::{SystemTime, UNIX_EPOCH},
};

use edr_eth::{
    block::{BlobGas, BlockOptions, Header, PartialHeader},
    log::Log,
    receipt::{TransactionReceipt, TypedReceipt, TypedReceiptData},
    transaction::SignedTransaction,
    trie::ordered_trie_root,
    Address, Bloom, U256,
};
use revm::{
    db::DatabaseComponentError,
    primitives::{
        AccountInfo, BlobExcessGasAndPrice, BlockEnv, CfgEnv, EVMError, ExecutionResult,
        InvalidHeader, InvalidTransaction, Output, ResultAndState, SpecId,
    },
};

use super::local::LocalBlock;
use crate::{
    blockchain::SyncBlockchain,
    evm::{build_evm, run_transaction, SyncInspector},
    state::{AccountModifierFn, StateDiff, SyncState},
    PendingTransaction,
};

/// An error caused during construction of a block builder.
#[derive(Debug, thiserror::Error)]
pub enum BlockBuilderCreationError {
    /// Unsupported hardfork. Hardforks older than Byzantium are not supported
    #[error("Unsupported hardfork: {0:?}. Hardforks older than Byzantium are not supported.")]
    UnsupportedHardfork(SpecId),
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
    /// Sender does not have enough funds to send transaction.
    #[error("Sender doesn't have enough funds to send tx. The max upfront cost is: {max_upfront_cost} and the sender's balance is: {sender_balance}.")]
    InsufficientFunds {
        /// The maximum upfront cost of the transaction
        max_upfront_cost: U256,
        /// The sender's balance
        sender_balance: U256,
    },
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
            EVMError::Transaction(e) => match e {
                InvalidTransaction::LackOfFundForMaxFee { fee, balance } => {
                    Self::InsufficientFunds {
                        max_upfront_cost: U256::from(fee),
                        sender_balance: balance,
                    }
                }
                _ => Self::InvalidTransaction(e),
            },
            EVMError::Header(
                InvalidHeader::ExcessBlobGasNotSet | InvalidHeader::PrevrandaoNotSet,
            ) => unreachable!("error: {error:?}"),
            EVMError::Database(DatabaseComponentError::State(e)) => Self::State(e),
            EVMError::Database(DatabaseComponentError::BlockHash(e)) => Self::BlockHash(e),
        }
    }
}

/// The result of building a block, using the [`BlockBuilder`].
pub struct BuildBlockResult {
    /// Built block
    pub block: LocalBlock,
    /// State diff
    pub state_diff: StateDiff,
}

/// A builder for constructing Ethereum blocks.
pub struct BlockBuilder {
    cfg: CfgEnv,
    header: PartialHeader,
    callers: Vec<Address>,
    transactions: Vec<SignedTransaction>,
    state_diff: StateDiff,
    receipts: Vec<TransactionReceipt<Log>>,
    parent_gas_limit: Option<u64>,
}

impl BlockBuilder {
    /// Creates an intance of [`BlockBuilder`].
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn new(
        cfg: CfgEnv,
        parent: &Header,
        options: BlockOptions,
    ) -> Result<Self, BlockBuilderCreationError> {
        if cfg.spec_id < SpecId::BYZANTIUM {
            return Err(BlockBuilderCreationError::UnsupportedHardfork(cfg.spec_id));
        }

        let parent_gas_limit = if options.gas_limit.is_none() {
            Some(parent.gas_limit)
        } else {
            None
        };

        let header = PartialHeader::new(cfg.spec_id, options, Some(parent));

        // TODO: Validate DAO extra data
        // if (this._common.hardforkIsActiveOnBlock(Hardfork.Dao, this.number) ===
        // false) {     return
        // }
        // const DAOActivationBlock = this._common.hardforkBlock(Hardfork.Dao)
        // if (DAOActivationBlock === null || this.number < DAOActivationBlock) {
        //     return
        // }
        // const DAO_ExtraData = Buffer.from('64616f2d686172642d666f726b', 'hex')
        // const DAO_ForceExtraDataRange = BigInt(9)
        // const drift = this.number - DAOActivationBlock
        // if (drift <= DAO_ForceExtraDataRange &&
        // !this.extraData.equals(DAO_ExtraData)) {     const msg =
        // this._errorMsg("extraData should be 'dao-hard-fork'")     throw new
        // Error(msg) }

        Ok(Self {
            cfg,
            header,
            callers: Vec::new(),
            transactions: Vec::new(),
            state_diff: StateDiff::default(),
            receipts: Vec::new(),
            parent_gas_limit,
        })
    }

    /// Retrieves the config of the block builder.
    pub fn config(&self) -> &CfgEnv {
        &self.cfg
    }

    /// Retrieves the amount of gas used in the block, so far.
    pub fn gas_used(&self) -> u64 {
        self.header.gas_used
    }

    /// Retrieves the amount of gas left in the block.
    pub fn gas_remaining(&self) -> u64 {
        self.header.gas_limit - self.gas_used()
    }

    // fn miner_reward(num_ommers: u64) -> U256 {
    //     // TODO: This is the LONDON block reward. Did it change?
    //     const BLOCK_REWARD: u64 = 2 * 10u64.pow(18);
    //     const NIBLING_REWARD: u64 = BLOCK_REWARD / 32;

    //     U256::from(BLOCK_REWARD + num_ommers * NIBLING_REWARD)
    // }

    /// Adds a pending transaction to
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn add_transaction<BlockchainErrorT, StateErrorT>(
        &mut self,
        blockchain: &dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
        state: &mut dyn SyncState<StateErrorT>,
        transaction: PendingTransaction,
        inspector: Option<&mut dyn SyncInspector<BlockchainErrorT, StateErrorT>>,
    ) -> Result<ExecutionResult, BlockTransactionError<BlockchainErrorT, StateErrorT>>
    where
        BlockchainErrorT: Debug + Send + 'static,
        StateErrorT: Debug + Send + 'static,
    {
        //  transaction's gas limit cannot be greater than the remaining gas in the
        // block
        if transaction.gas_limit() > self.gas_remaining() {
            return Err(BlockTransactionError::ExceedsBlockGasLimit);
        }

        let block = BlockEnv {
            number: U256::from(self.header.number),
            coinbase: self.header.beneficiary,
            timestamp: U256::from(self.header.timestamp),
            difficulty: self.header.difficulty,
            basefee: self.header.base_fee.unwrap_or(U256::ZERO),
            gas_limit: U256::from(self.header.gas_limit),
            prevrandao: if self.cfg.spec_id >= SpecId::MERGE {
                Some(self.header.mix_hash)
            } else {
                None
            },
            blob_excess_gas_and_price: self
                .header
                .blob_gas
                .as_ref()
                .map(|BlobGas { excess_gas, .. }| BlobExcessGasAndPrice::new(*excess_gas)),
        };

        let evm = build_evm(
            blockchain,
            &state,
            self.cfg.clone(),
            transaction.clone().into(),
            block.clone(),
        );

        let ResultAndState {
            result,
            state: state_diff,
        } = run_transaction(evm, inspector)?;

        self.state_diff.apply_diff(state_diff.clone());

        state.commit(state_diff);

        self.header.gas_used += result.gas_used();

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
        let effective_gas_price = if let SignedTransaction::Eip1559(transaction) = &*transaction {
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
                    SignedTransaction::PreEip155Legacy(_)
                    | SignedTransaction::PostEip155Legacy(_) => {
                        if self.cfg.spec_id < SpecId::BYZANTIUM {
                            TypedReceiptData::PreEip658Legacy {
                                state_root: state
                                    .state_root()
                                    .expect("Must be able to calculate state root"),
                            }
                        } else {
                            TypedReceiptData::PostEip658Legacy { status }
                        }
                    }
                    SignedTransaction::Eip2930(_) => TypedReceiptData::Eip2930 { status },
                    SignedTransaction::Eip1559(_) => TypedReceiptData::Eip1559 { status },
                    SignedTransaction::Eip4844(_) => TypedReceiptData::Eip4844 { status },
                },
            },
            transaction_hash: *transaction.hash(),
            transaction_index: self.transactions.len() as u64,
            from: *transaction.caller(),
            to: transaction.to(),
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

    /// Finalizes the block, returning the block and the callers of the
    /// transactions.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn finalize<StateT, StateErrorT>(
        mut self,
        state: &mut StateT,
        rewards: Vec<(Address, U256)>,
        timestamp: Option<u64>,
    ) -> Result<BuildBlockResult, StateErrorT>
    where
        StateT: SyncState<StateErrorT> + ?Sized,
        StateErrorT: Debug + Send,
    {
        for (address, reward) in rewards {
            state.modify_account(
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
            )?;

            let account_info = state
                .basic(address)?
                .expect("Account must exist after modification");

            self.state_diff.apply_account_change(address, account_info);
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
        } else if self.header.timestamp == 0 {
            self.header.timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("Current time must be after unix epoch")
                .as_secs();
        }

        // TODO: handle ommers
        let block = LocalBlock::new(
            self.header,
            self.transactions,
            self.callers,
            self.receipts,
            Vec::new(),
            None,
        );

        Ok(BuildBlockResult {
            block,
            state_diff: self.state_diff,
        })
    }
}
