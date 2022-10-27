use std::{fmt::Debug, sync::Arc};

use anyhow::bail;
use rethnet_eth::{
    block::{Header, PartialHeader},
    H256, U256,
};
use revm::{BlockEnv, CfgEnv, ExecutionResult, SpecId, TxEnv};

use crate::{
    db::{AsyncDatabase, SyncDatabase},
    evm::build_evm,
    inspector::RethnetInspector,
    HeaderData,
};

/// A builder for constructing Ethereum blocks.
pub struct BlockBuilder<E>
where
    E: Debug + Send + 'static,
{
    state: Arc<AsyncDatabase<Box<dyn SyncDatabase<E>>, E>>,
    header: PartialHeader,
    transactions: Vec<TxEnv>,
    cfg: CfgEnv,
}

impl<E> BlockBuilder<E>
where
    E: Debug + Send + 'static,
{
    /// Creates an intance of [`BlockBuilder`], creating a checkpoint in the process.
    pub async fn new(
        db: Arc<AsyncDatabase<Box<dyn SyncDatabase<E>>, E>>,
        cfg: CfgEnv,
        parent: Header,
        header: HeaderData,
    ) -> Result<Self, E> {
        db.checkpoint().await?;

        // TODO: Allow user to pass in values
        let header = PartialHeader {
            parent_hash: header.parent_hash.unwrap_or(parent.parent_hash),
            number: header.number.unwrap_or(parent.number + U256::from(1)),
            gas_limit: header.gas_limit.unwrap_or(parent.gas_limit),
            ..PartialHeader::default()
        };

        Ok(Self {
            state: db,
            header,
            transactions: Vec::new(),
            cfg,
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

    fn miner_reward(num_ommers: u64) -> U256 {
        // TODO: This is the LONDON block reward. Did it change?
        const BLOCK_REWARD: u64 = 2 * 10u64.pow(18);
        const NIBLING_REWARD: u64 = BLOCK_REWARD / 32;

        U256::from(BLOCK_REWARD + num_ommers * NIBLING_REWARD)
    }

    /// Adds a pending transaction to
    pub async fn add_transaction(&mut self, transaction: TxEnv) -> anyhow::Result<ExecutionResult> {
        //  transaction's gas limit cannot be greater than the remaining gas in the block
        if U256::from(transaction.gas_limit) > self.gas_remaining() {
            bail!("tx has a higher gas limit than the remaining gas in the block");
        }

        self.transactions.push(transaction.clone());
        let block = BlockEnv {
            number: self.header.number,
            coinbase: self.header.beneficiary,
            timestamp: U256::from(self.header.timestamp),
            difficulty: self.header.difficulty,
            basefee: self.header.base_fee.unwrap_or(U256::ZERO),
            gas_limit: self.header.gas_limit,
        };

        let db = self.state.clone();
        let cfg = self.cfg.clone();

        let (result, changes) = self
            .state
            .runtime()
            .spawn(async move {
                let mut evm = build_evm(&db, cfg, transaction, block);
                evm.inspect(RethnetInspector::default())
            })
            .await
            .unwrap();

        self.state.apply(changes).await;

        self.header.gas_used += U256::from(result.gas_used);

        // TODO: store receipt
        Ok(result)
    }

    /// Finalizes the block, returning the state root.
    /// TODO: Build a full block
    pub async fn finalize(self) -> Result<H256, E> {
        #[derive(Eq, PartialEq)]
        enum ConsensusType {
            ProofOfStake,
            ProofOfWork,
        }
        let consensus_type = if SpecId::enabled(self.cfg.spec_id, SpecId::MERGE) {
            ConsensusType::ProofOfStake
        } else {
            ConsensusType::ProofOfWork
        };

        if consensus_type == ConsensusType::ProofOfWork {
            self.state
                .modify_account(
                    self.header.beneficiary,
                    Box::new(|account_info| account_info.balance += Self::miner_reward(0)),
                )
                .await?;
        }

        // let block = Block::new(self.header, self.transactions, Vec::new());
        // let state_root = trie_root(input);
        // Ok(state_root)
        todo!()
    }
}
