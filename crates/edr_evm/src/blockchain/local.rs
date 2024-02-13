use std::{
    collections::BTreeMap,
    fmt::Debug,
    num::NonZeroU64,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use edr_eth::{
    block::{BlobGas, PartialHeader},
    log::FilterLog,
    trie::KECCAK_NULL_RLP,
    Address, Bytes, B256, B64, U256,
};
use revm::{
    db::BlockHashRef,
    primitives::{HashSet, SpecId},
    DatabaseCommit,
};

use super::{
    compute_state_at_block, storage::ReservableSparseBlockchainStorage, validate_next_block,
    Blockchain, BlockchainError, BlockchainMut,
};
use crate::{
    state::{StateDebug, StateDiff, StateError, StateOverride, SyncState, TrieState},
    Block, BlockAndTotalDifficulty, LocalBlock, SyncBlock,
};

/// An error that occurs upon creation of a [`LocalBlockchain`].
#[derive(Debug, thiserror::Error)]
pub enum CreationError {
    /// Missing blob gas information for post-Cancun blockchain
    #[error("Missing blob gas information for post-Cancun blockchain")]
    MissingBlobGas,
    /// Missing parent beacon block root for post-Cancun blockchain
    #[error("Missing parent beacon block root for post-Cancun blockchain")]
    MissingParentBeaconBlockRoot,
    /// Missing prevrandao for post-merge blockchain
    #[error("Missing prevrandao for post-merge blockchain")]
    MissingPrevrandao,
}

#[derive(Debug, thiserror::Error)]
pub enum InsertBlockError {
    #[error("Invalid block number: {actual}. Expected: {expected}")]
    InvalidBlockNumber { actual: u64, expected: u64 },
    /// Missing withdrawals for post-Shanghai blockchain
    #[error("Missing withdrawals for post-Shanghai blockchain")]
    MissingWithdrawals,
}

/// A blockchain consisting of locally created blocks.
#[derive(Debug)]
pub struct LocalBlockchain {
    storage: ReservableSparseBlockchainStorage<Arc<dyn SyncBlock<Error = BlockchainError>>>,
    chain_id: u64,
    spec_id: SpecId,
}

impl LocalBlockchain {
    /// Constructs a new instance using the provided arguments to build a
    /// genesis block.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        genesis_diff: StateDiff,
        chain_id: u64,
        spec_id: SpecId,
        gas_limit: u64,
        timestamp: Option<u64>,
        prevrandao: Option<B256>,
        base_fee: Option<U256>,
        blob_gas: Option<BlobGas>,
        parent_beacon_block_root: Option<B256>,
    ) -> Result<Self, CreationError> {
        const EXTRA_DATA: &[u8] = b"\x12\x34";

        let mut genesis_state = TrieState::default();
        genesis_state.commit(genesis_diff.clone().into());

        let partial_header = PartialHeader {
            state_root: genesis_state
                .state_root()
                .expect("TrieState is guaranteed to successfully compute the state root"),
            receipts_root: KECCAK_NULL_RLP,
            difficulty: if spec_id >= SpecId::MERGE {
                U256::ZERO
            } else {
                U256::from(1)
            },
            number: 0,
            gas_limit,
            gas_used: 0,
            timestamp: timestamp.unwrap_or_else(|| {
                SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .expect("Current time must be after unix epoch")
                    .as_secs()
            }),
            extra_data: Bytes::from(EXTRA_DATA),
            mix_hash: if spec_id >= SpecId::MERGE {
                prevrandao.ok_or(CreationError::MissingPrevrandao)?
            } else {
                B256::ZERO
            },
            nonce: if spec_id >= SpecId::MERGE {
                B64::ZERO
            } else {
                B64::from(66u64)
            },
            base_fee: if spec_id >= SpecId::LONDON {
                // Initial base fee from https://eips.ethereum.org/EIPS/eip-1559
                Some(base_fee.unwrap_or(U256::from(1_000_000_000)))
            } else {
                None
            },
            withdrawals_root: if spec_id >= SpecId::SHANGHAI {
                Some(KECCAK_NULL_RLP)
            } else {
                None
            },
            blob_gas: if spec_id >= SpecId::CANCUN {
                Some(blob_gas.ok_or(CreationError::MissingBlobGas)?)
            } else {
                None
            },
            parent_beacon_block_root: if spec_id >= SpecId::CANCUN {
                Some(parent_beacon_block_root.ok_or(CreationError::MissingParentBeaconBlockRoot)?)
            } else {
                None
            },
            ..PartialHeader::default()
        };

        Ok(unsafe {
            Self::with_genesis_block_unchecked(
                LocalBlock::empty(spec_id, partial_header),
                genesis_diff,
                chain_id,
                spec_id,
            )
        })
    }

    /// Constructs a new instance with the provided genesis block, validating a
    /// zero block number.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub fn with_genesis_block(
        genesis_block: LocalBlock,
        genesis_diff: StateDiff,
        chain_id: u64,
        spec_id: SpecId,
    ) -> Result<Self, InsertBlockError> {
        let genesis_header = genesis_block.header();

        if genesis_header.number != 0 {
            return Err(InsertBlockError::InvalidBlockNumber {
                actual: genesis_header.number,
                expected: 0,
            });
        }

        if spec_id >= SpecId::SHANGHAI && genesis_header.withdrawals_root.is_none() {
            return Err(InsertBlockError::MissingWithdrawals);
        }

        Ok(unsafe {
            Self::with_genesis_block_unchecked(genesis_block, genesis_diff, chain_id, spec_id)
        })
    }

    /// Constructs a new instance with the provided genesis block, without
    /// validating the provided block's number.
    ///
    /// # Safety
    ///
    /// Ensure that the genesis block's number is zero.
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    pub unsafe fn with_genesis_block_unchecked(
        genesis_block: LocalBlock,
        genesis_diff: StateDiff,
        chain_id: u64,
        spec_id: SpecId,
    ) -> Self {
        let genesis_block: Arc<dyn SyncBlock<Error = BlockchainError>> = Arc::new(genesis_block);

        let total_difficulty = genesis_block.header().difficulty;
        let storage = ReservableSparseBlockchainStorage::with_genesis_block(
            genesis_block,
            genesis_diff,
            total_difficulty,
        );

        Self {
            storage,
            chain_id,
            spec_id,
        }
    }
}

impl Blockchain for LocalBlockchain {
    type BlockchainError = BlockchainError;

    type StateError = StateError;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    #[allow(clippy::type_complexity)]
    fn block_by_hash(
        &self,
        hash: &B256,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = Self::BlockchainError>>>, Self::BlockchainError>
    {
        Ok(self.storage.block_by_hash(hash))
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    #[allow(clippy::type_complexity)]
    fn block_by_number(
        &self,
        number: u64,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = Self::BlockchainError>>>, Self::BlockchainError>
    {
        Ok(self.storage.block_by_number(number))
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    #[allow(clippy::type_complexity)]
    fn block_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<dyn SyncBlock<Error = Self::BlockchainError>>>, Self::BlockchainError>
    {
        Ok(self.storage.block_by_transaction_hash(transaction_hash))
    }

    fn chain_id(&self) -> u64 {
        self.chain_id
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn last_block(
        &self,
    ) -> Result<Arc<dyn SyncBlock<Error = Self::BlockchainError>>, Self::BlockchainError> {
        Ok(self
            .storage
            .block_by_number(self.storage.last_block_number())
            .expect("Block must exist"))
    }

    fn last_block_number(&self) -> u64 {
        self.storage.last_block_number()
    }

    fn logs(
        &self,
        from_block: u64,
        to_block: u64,
        addresses: &HashSet<Address>,
        normalized_topics: &[Option<Vec<B256>>],
    ) -> Result<Vec<FilterLog>, Self::BlockchainError> {
        self.storage
            .logs(from_block, to_block, addresses, normalized_topics)
    }

    fn network_id(&self) -> u64 {
        self.chain_id
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn receipt_by_transaction_hash(
        &self,
        transaction_hash: &B256,
    ) -> Result<Option<Arc<edr_eth::receipt::BlockReceipt>>, Self::BlockchainError> {
        Ok(self.storage.receipt_by_transaction_hash(transaction_hash))
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn spec_at_block_number(&self, block_number: u64) -> Result<SpecId, Self::BlockchainError> {
        if block_number > self.last_block_number() {
            return Err(BlockchainError::UnknownBlockNumber);
        }

        Ok(self.spec_id)
    }

    fn spec_id(&self) -> SpecId {
        self.spec_id
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn state_at_block_number(
        &self,
        block_number: u64,
        state_overrides: &BTreeMap<u64, StateOverride>,
    ) -> Result<Box<dyn SyncState<Self::StateError>>, Self::BlockchainError> {
        if block_number > self.last_block_number() {
            return Err(BlockchainError::UnknownBlockNumber);
        }

        let mut state = TrieState::default();
        compute_state_at_block(&mut state, &self.storage, 0, block_number, state_overrides);

        Ok(Box::new(state))
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn total_difficulty_by_hash(&self, hash: &B256) -> Result<Option<U256>, Self::BlockchainError> {
        Ok(self.storage.total_difficulty_by_hash(hash))
    }
}

impl BlockchainMut for LocalBlockchain {
    type Error = BlockchainError;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn insert_block(
        &mut self,
        block: LocalBlock,
        state_diff: StateDiff,
    ) -> Result<BlockAndTotalDifficulty<Self::Error>, Self::Error> {
        let last_block = self.last_block()?;

        validate_next_block(self.spec_id, &last_block, &block)?;

        let previous_total_difficulty = self
            .total_difficulty_by_hash(last_block.hash())
            .expect("No error can occur as it is stored locally")
            .expect("Must exist as its block is stored");

        let total_difficulty = previous_total_difficulty + block.header().difficulty;

        // SAFETY: The block number is guaranteed to be unique, so the block hash must
        // be too.
        let block = unsafe {
            self.storage
                .insert_block_unchecked(block, state_diff, total_difficulty)
        };

        Ok(BlockAndTotalDifficulty {
            block: block.clone(),
            total_difficulty: Some(total_difficulty),
        })
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn reserve_blocks(&mut self, additional: u64, interval: u64) -> Result<(), Self::Error> {
        let additional = if let Some(additional) = NonZeroU64::new(additional) {
            additional
        } else {
            return Ok(()); // nothing to do
        };

        let last_block = self.last_block()?;
        let previous_total_difficulty = self
            .total_difficulty_by_hash(last_block.hash())?
            .expect("Must exist as its block is stored");

        let last_header = last_block.header();

        self.storage.reserve_blocks(
            additional,
            interval,
            last_header.base_fee_per_gas,
            last_header.state_root,
            previous_total_difficulty,
            self.spec_id,
        );

        Ok(())
    }

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn revert_to_block(&mut self, block_number: u64) -> Result<(), Self::Error> {
        if self.storage.revert_to_block(block_number) {
            Ok(())
        } else {
            Err(BlockchainError::UnknownBlockNumber)
        }
    }
}

impl BlockHashRef for LocalBlockchain {
    type Error = BlockchainError;

    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn block_hash(&self, number: U256) -> Result<B256, Self::Error> {
        let number =
            u64::try_from(number).map_err(|_error| BlockchainError::BlockNumberTooLarge)?;

        self.storage
            .block_by_number(number)
            .map(|block| *block.hash())
            .ok_or(BlockchainError::UnknownBlockNumber)
    }
}

#[cfg(test)]
mod tests {
    use edr_eth::{AccountInfo, HashMap};
    use revm::primitives::{Account, AccountStatus};

    use super::*;
    use crate::state::IrregularState;

    #[test]
    fn compute_state_after_reserve() -> anyhow::Result<()> {
        let address1 = Address::random();
        let accounts = vec![(
            address1,
            AccountInfo {
                balance: U256::from(1_000_000_000u64),
                ..AccountInfo::default()
            },
        )];

        let genesis_diff = accounts
            .iter()
            .map(|(address, info)| {
                (
                    *address,
                    Account {
                        info: info.clone(),
                        storage: HashMap::new(),
                        status: AccountStatus::Created | AccountStatus::Touched,
                    },
                )
            })
            .collect::<HashMap<_, _>>()
            .into();

        let mut blockchain = LocalBlockchain::new(
            genesis_diff,
            123,
            SpecId::SHANGHAI,
            6_000_000,
            None,
            Some(B256::random()),
            None,
            Some(BlobGas::default()),
            Some(B256::random()),
        )
        .unwrap();

        let irregular_state = IrregularState::default();
        let expected = blockchain.state_at_block_number(0, irregular_state.state_overrides())?;

        blockchain.reserve_blocks(1_000_000_000, 1)?;

        let actual =
            blockchain.state_at_block_number(1_000_000_000, irregular_state.state_overrides())?;

        assert_eq!(actual.state_root().unwrap(), expected.state_root().unwrap());

        for (address, expected) in accounts {
            let actual_account = actual.basic(address)?.expect("account should exist");
            assert_eq!(actual_account, expected);
        }

        Ok(())
    }
}
