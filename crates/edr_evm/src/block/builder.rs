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
    BE: Debug + Send,
    SE: Debug + Send,
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
    transactions: Vec<ExecutableTransaction>,
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
        dao_hardfork_activation_block: Option<u64>,
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

        if let Some(dao_hardfork_activation_block) = dao_hardfork_activation_block {
            const DAO_FORCE_EXTRA_DATA_RANGE: u64 = 9;

            let drift = header.number - dao_hardfork_activation_block;
            if cfg.spec_id >= SpecId::DAO_FORK
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

    /// Retrieves the header of the block builder.
    pub fn header(&self) -> &PartialHeader {
        &self.header
    }

    /// Adds a pending transaction to
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn add_transaction<BlockchainErrorT, StateErrorT>(
        &mut self,
        blockchain: &dyn SyncBlockchain<BlockchainErrorT, StateErrorT>,
        state: &mut dyn SyncState<StateErrorT>,
        transaction: ExecutableTransaction,
        inspector: Option<&mut dyn SyncInspector<BlockchainErrorT, StateErrorT>>,
    ) -> Result<ExecutionResult, BlockTransactionError<BlockchainErrorT, StateErrorT>>
    where
        BlockchainErrorT: Debug + Send,
        StateErrorT: Debug + Send,
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
        let effective_gas_price = if blockchain.spec_id() >= SpecId::LONDON {
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
                spec_id: self.cfg.spec_id,
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

        Ok(result)
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
                    &|| {
                        Ok(AccountInfo {
                            code: None,
                            ..AccountInfo::default()
                        })
                    },
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
            None,
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

        let mut cfg = CfgEnv::default();
        cfg.spec_id = SpecId::BYZANTIUM;

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

        let mut cfg = CfgEnv::default();
        cfg.spec_id = SpecId::BYZANTIUM;

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
