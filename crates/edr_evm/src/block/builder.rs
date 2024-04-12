use std::{
    fmt::Debug,
    time::{SystemTime, UNIX_EPOCH},
};

use edr_eth::{
    block::{BlobGas, BlockOptions, Header, PartialHeader},
    log::{add_log_to_bloom, Log},
    receipt::{TransactionReceipt, TypedReceipt, TypedReceiptData},
    transaction::SignedTransaction,
    trie::{ordered_trie_root, KECCAK_NULL_RLP},
    withdrawal::Withdrawal,
    Address, Bloom, U256,
};
use revm::{
    db::{DatabaseComponentError, DatabaseComponents, StateRef},
    primitives::{
        BlobExcessGasAndPrice, BlockEnv, CfgEnvWithHandlerCfg, EVMError, EnvWithHandlerCfg,
        ExecutionResult, InvalidHeader, InvalidTransaction, Output, ResultAndState, SpecId,
        MAX_BLOB_GAS_PER_BLOCK,
    },
    Context, DatabaseCommit, Evm, InnerEvmContext,
};

use super::local::LocalBlock;
use crate::{
    blockchain::SyncBlockchain,
    debug::{DebugContext, EvmContext},
    state::{AccountModifierFn, StateDebug, StateDiff, SyncState},
    ExecutableTransaction,
};

const DAO_EXTRA_DATA: &[u8] = b"dao-hard-fork";

/// An error caused during construction of a block builder.
#[derive(Debug, thiserror::Error)]
pub enum BlockBuilderCreationError {
    /// The extra data is invalid for a DAO hardfork.
    #[error("extraData should be dao-hard-fork")]
    DaoHardforkInvalidData,
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
    /// Custom error
    #[error("{0}")]
    Custom(String),
    /// Transaction has higher gas limit than is remaining in block
    #[error("Transaction has a higher gas limit than the remaining gas in the block")]
    ExceedsBlockGasLimit,
    /// Transaction has higher blob gas usage than is remaining in block
    #[error("Transaction has higher blob gas usage than is remaining in block")]
    ExceedsBlockBlobGasLimit,
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
    BE: Debug + Send,
    SE: Debug + Send,
{
    fn from(error: EVMError<DatabaseComponentError<SE, BE>>) -> Self {
        match error {
            EVMError::Transaction(e) => match e {
                InvalidTransaction::LackOfFundForMaxFee { fee, balance } => {
                    Self::InsufficientFunds {
                        max_upfront_cost: *fee,
                        sender_balance: *balance,
                    }
                }
                _ => Self::InvalidTransaction(e),
            },
            EVMError::Database(DatabaseComponentError::State(e)) => Self::State(e),
            EVMError::Database(DatabaseComponentError::BlockHash(e)) => Self::BlockHash(e),
            // This case is a bug in our codebase for local blockchains, but it can happen that the
            // remote returns incorrect block data in which case we should return a custom error.
            EVMError::Header(
                error @ (InvalidHeader::ExcessBlobGasNotSet | InvalidHeader::PrevrandaoNotSet),
            ) => Self::Custom(error.to_string()),
            EVMError::Custom(error) => Self::Custom(error),
        }
    }
}

/// The result of executing a transaction, along with the context in which it
/// was executed.
pub struct ExecutionResultWithContext<
    'evm,
    BlockchainErrorT,
    StateErrorT,
    DebugDataT,
    StateT: StateRef,
> {
    /// The result of executing the transaction.
    pub result: Result<ExecutionResult, BlockTransactionError<BlockchainErrorT, StateErrorT>>,
    /// The context in which the transaction was executed.
    pub evm_context: EvmContext<'evm, BlockchainErrorT, DebugDataT, StateT>,
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
    cfg: CfgEnvWithHandlerCfg,
    header: PartialHeader,
    transactions: Vec<ExecutableTransaction>,
    state_diff: StateDiff,
    receipts: Vec<TransactionReceipt<Log>>,
    parent_gas_limit: Option<u64>,
    withdrawals: Option<Vec<Withdrawal>>,
}

impl BlockBuilder {
    /// Creates an intance of [`BlockBuilder`].
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn new(
        cfg: CfgEnvWithHandlerCfg,
        parent: &Header,
        mut options: BlockOptions,
        dao_hardfork_activation_block: Option<u64>,
    ) -> Result<Self, BlockBuilderCreationError> {
        if cfg.handler_cfg.spec_id < SpecId::BYZANTIUM {
            return Err(BlockBuilderCreationError::UnsupportedHardfork(
                cfg.handler_cfg.spec_id,
            ));
        }

        let parent_gas_limit = if options.gas_limit.is_none() {
            Some(parent.gas_limit)
        } else {
            None
        };

        let withdrawals = std::mem::take(&mut options.withdrawals).or_else(|| {
            if cfg.handler_cfg.spec_id >= SpecId::SHANGHAI {
                Some(Vec::new())
            } else {
                None
            }
        });

        let header = PartialHeader::new(cfg.handler_cfg.spec_id, options, Some(parent));

        if let Some(dao_hardfork_activation_block) = dao_hardfork_activation_block {
            const DAO_FORCE_EXTRA_DATA_RANGE: u64 = 9;

            let drift = header.number - dao_hardfork_activation_block;
            if cfg.handler_cfg.spec_id >= SpecId::DAO_FORK
                && drift <= DAO_FORCE_EXTRA_DATA_RANGE
                && *header.extra_data != DAO_EXTRA_DATA
            {
                return Err(BlockBuilderCreationError::DaoHardforkInvalidData);
            }
        }

        Ok(Self {
            cfg,
            header,
            transactions: Vec::new(),
            state_diff: StateDiff::default(),
            receipts: Vec::new(),
            parent_gas_limit,
            withdrawals,
        })
    }

    /// Retrieves the config of the block builder.
    pub fn config(&self) -> &CfgEnvWithHandlerCfg {
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

    /// Retrieves the header of the block builder.
    pub fn header(&self) -> &PartialHeader {
        &self.header
    }

    /// Adds a pending transaction to
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn add_transaction<'blockchain, 'evm, BlockchainErrorT, DebugDataT, StateT, StateErrorT>(
        &mut self,
        blockchain: &'blockchain dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
        state: StateT,
        transaction: ExecutableTransaction,
        debug_context: Option<DebugContext<'evm, BlockchainErrorT, DebugDataT, StateT>>,
    ) -> ExecutionResultWithContext<'evm, BlockchainErrorT, StateErrorT, DebugDataT, StateT>
    where
        'blockchain: 'evm,
        BlockchainErrorT: Debug + Send,
        StateT: StateRef<Error = StateErrorT> + DatabaseCommit + StateDebug<Error = StateErrorT>,
        StateErrorT: Debug + Send,
    {
        //  transaction's gas limit cannot be greater than the remaining gas in the
        // block
        if transaction.gas_limit() > self.gas_remaining() {
            return ExecutionResultWithContext {
                result: Err(BlockTransactionError::ExceedsBlockGasLimit),
                evm_context: EvmContext {
                    debug: debug_context,
                    state,
                },
            };
        }

        let blob_gas = transaction.total_blob_gas().unwrap_or_default();
        if let Some(BlobGas { gas_used, .. }) = self.header.blob_gas.as_ref() {
            if gas_used + blob_gas > MAX_BLOB_GAS_PER_BLOCK {
                return ExecutionResultWithContext {
                    result: Err(BlockTransactionError::ExceedsBlockBlobGasLimit),
                    evm_context: EvmContext {
                        debug: debug_context,
                        state,
                    },
                };
            }
        }

        let spec_id = self.cfg.handler_cfg.spec_id;

        let block = BlockEnv {
            number: U256::from(self.header.number),
            coinbase: self.header.beneficiary,
            timestamp: U256::from(self.header.timestamp),
            difficulty: self.header.difficulty,
            basefee: self.header.base_fee.unwrap_or(U256::ZERO),
            gas_limit: U256::from(self.header.gas_limit),
            prevrandao: if spec_id >= SpecId::MERGE {
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

        let env = EnvWithHandlerCfg::new_with_cfg_env(
            self.cfg.clone(),
            block.clone(),
            transaction.clone().into(),
        );

        let db = DatabaseComponents {
            state,
            block_hash: blockchain,
        };

        let (
            mut evm_context,
            ResultAndState {
                result,
                state: state_diff,
            },
        ) = {
            if let Some(debug_context) = debug_context {
                let mut evm = Evm::builder()
                    .with_ref_db(db)
                    .with_external_context(debug_context.data)
                    .with_env_with_handler_cfg(env)
                    .append_handler_register(debug_context.register_handles_fn)
                    .build();

                let result = evm.transact();
                let Context {
                    evm:
                        revm::EvmContext {
                            inner: InnerEvmContext { db, .. },
                            ..
                        },
                    external,
                } = evm.into_context();

                let evm_context = EvmContext {
                    debug: Some(DebugContext {
                        data: external,
                        register_handles_fn: debug_context.register_handles_fn,
                    }),
                    state: db.0.state,
                };

                match result {
                    Ok(result) => (evm_context, result),
                    Err(error) => {
                        return ExecutionResultWithContext {
                            result: Err(error.into()),
                            evm_context,
                        };
                    }
                }
            } else {
                let mut evm = Evm::builder()
                    .with_ref_db(db)
                    .with_env_with_handler_cfg(env)
                    .build();

                let result = evm.transact();
                let Context {
                    evm:
                        revm::EvmContext {
                            inner: InnerEvmContext { db, .. },
                            ..
                        },
                    ..
                } = evm.into_context();

                let evm_context = EvmContext {
                    debug: None,
                    state: db.0.state,
                };

                match result {
                    Ok(result) => (evm_context, result),
                    Err(error) => {
                        return ExecutionResultWithContext {
                            result: Err(error.into()),
                            evm_context,
                        };
                    }
                }
            }
        };

        let state = &mut evm_context.state;

        self.state_diff.apply_diff(state_diff.clone());

        state.commit(state_diff);

        self.header.gas_used += result.gas_used();

        if let Some(BlobGas { gas_used, .. }) = self.header.blob_gas.as_mut() {
            *gas_used += blob_gas;
        }

        let logs = result.logs().to_vec();
        let logs_bloom = {
            let mut bloom = Bloom::ZERO;
            for log in &logs {
                add_log_to_bloom(log, &mut bloom);
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
        let effective_gas_price = if spec_id >= SpecId::LONDON {
            if let SignedTransaction::Eip1559(transaction) = &*transaction {
                block.basefee
                    + (gas_price - block.basefee).min(transaction.max_priority_fee_per_gas)
            } else {
                gas_price
            }
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
                        if spec_id < SpecId::BYZANTIUM {
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
                spec_id,
            },
            transaction_hash: *transaction.hash(),
            transaction_index: self.transactions.len() as u64,
            from: *transaction.caller(),
            to: transaction.to(),
            contract_address,
            gas_used: result.gas_used(),
            effective_gas_price: Some(effective_gas_price),
        };
        self.receipts.push(receipt);

        self.transactions.push(transaction);

        ExecutionResultWithContext {
            result: Ok(result),
            evm_context,
        }
    }

    /// Finalizes the block, returning the block and the callers of the
    /// transactions.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn finalize<StateT, StateErrorT>(
        mut self,
        state: &mut StateT,
        rewards: Vec<(Address, U256)>,
    ) -> Result<BuildBlockResult, StateErrorT>
    where
        StateT: SyncState<StateErrorT> + ?Sized,
        StateErrorT: Debug + Send,
    {
        for (address, reward) in rewards {
            if reward > U256::ZERO {
                let account_info = state.modify_account(
                    address,
                    AccountModifierFn::new(Box::new(move |balance, _nonce, _code| {
                        *balance += reward;
                    })),
                )?;

                self.state_diff.apply_account_change(address, account_info);
            }
        }

        if let Some(gas_limit) = self.parent_gas_limit {
            self.header.gas_limit = gas_limit;
        }

        self.header.logs_bloom = {
            let mut logs_bloom = Bloom::ZERO;
            self.receipts.iter().for_each(|receipt| {
                logs_bloom.accrue_bloom(receipt.logs_bloom());
            });
            logs_bloom
        };

        self.header.receipts_root = ordered_trie_root(
            self.receipts
                .iter()
                .map(|receipt| alloy_rlp::encode(&**receipt)),
        );

        // Only set the state root if it wasn't specified during construction
        if self.header.state_root == KECCAK_NULL_RLP {
            self.header.state_root = state
                .state_root()
                .expect("Must be able to calculate state root");
        }

        // Only set the timestamp if it wasn't specified during construction
        if self.header.timestamp == 0 {
            self.header.timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("Current time must be after unix epoch")
                .as_secs();
        }

        // TODO: handle ommers
        let block = LocalBlock::new(
            self.header,
            self.transactions,
            self.receipts,
            Vec::new(),
            self.withdrawals,
        );

        Ok(BuildBlockResult {
            block,
            state_diff: self.state_diff,
        })
    }
}

#[cfg(test)]
mod tests {
    use edr_eth::Bytes;
    use revm::primitives::CfgEnv;

    #[test]
    fn dao_hardfork_has_extra_data() {
        use edr_eth::block::BlockOptions;

        use super::*;

        const DUMMY_DAO_HARDFORK_BLOCK_NUMBER: u64 = 3;

        // Create a random block header
        let header = Header {
            number: DUMMY_DAO_HARDFORK_BLOCK_NUMBER - 1,
            ..Header::default()
        };

        let cfg = CfgEnvWithHandlerCfg::new_with_spec_id(CfgEnv::default(), SpecId::BYZANTIUM);
        let block_options = BlockOptions {
            number: Some(DUMMY_DAO_HARDFORK_BLOCK_NUMBER),
            extra_data: Some(Bytes::from(DAO_EXTRA_DATA)),
            ..BlockOptions::default()
        };

        let block_builder = BlockBuilder::new(
            cfg,
            &header,
            block_options,
            Some(DUMMY_DAO_HARDFORK_BLOCK_NUMBER),
        );
        assert!(block_builder.is_ok());
    }

    #[test]
    fn dao_hardfork_missing_extra_data() {
        use edr_eth::block::BlockOptions;

        use super::*;

        const DUMMY_DAO_HARDFORK_BLOCK_NUMBER: u64 = 3;

        // Create a random block header
        let header = Header {
            number: DUMMY_DAO_HARDFORK_BLOCK_NUMBER - 1,
            ..Header::default()
        };

        let cfg = CfgEnvWithHandlerCfg::new_with_spec_id(CfgEnv::default(), SpecId::BYZANTIUM);

        let block_options = BlockOptions {
            number: Some(DUMMY_DAO_HARDFORK_BLOCK_NUMBER),
            ..BlockOptions::default()
        };

        let block_builder = BlockBuilder::new(
            cfg,
            &header,
            block_options,
            Some(DUMMY_DAO_HARDFORK_BLOCK_NUMBER),
        );
        assert!(matches!(
            block_builder,
            Err(BlockBuilderCreationError::DaoHardforkInvalidData)
        ));
    }
}
