use std::sync::Arc;

use edr_eth::{
    remote::{eth, BlockSpec, PreEip1898BlockSpec},
    B256, U256, U64,
};
use edr_evm::{blockchain::BlockchainError, SyncBlock};

use crate::{
    data::{BlockAndTotalDifficulty, BlockDataForTransaction, ProviderData, TransactionAndBlock},
    requests::{eth::transaction_to_rpc_result, validation::validate_post_merge_block_tags},
    ProviderError,
};

#[derive(Clone, Debug, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(untagged)]
pub enum HashOrTransaction {
    Hash(B256),
    Transaction(eth::Transaction),
}

pub fn handle_get_block_by_hash_request(
    data: &ProviderData,
    block_hash: B256,
    transaction_detail_flag: bool,
) -> Result<Option<eth::Block<HashOrTransaction>>, ProviderError> {
    data.block_by_hash(&block_hash)?
        .map(|block| {
            let total_difficulty = data.total_difficulty_by_hash(block.hash())?;
            let pending = false;
            block_to_rpc_output(
                data,
                block,
                pending,
                total_difficulty,
                transaction_detail_flag,
            )
        })
        .transpose()
}

pub fn handle_get_block_by_number_request(
    data: &ProviderData,
    block_spec: PreEip1898BlockSpec,
    transaction_detail_flag: bool,
) -> Result<Option<eth::Block<HashOrTransaction>>, ProviderError> {
    block_by_number(data, &block_spec.into())?
        .map(
            |BlockAndTotalDifficulty {
                 block,
                 pending,
                 total_difficulty,
             }| {
                block_to_rpc_output(
                    data,
                    block,
                    pending,
                    total_difficulty,
                    transaction_detail_flag,
                )
            },
        )
        .transpose()
}

pub fn handle_get_block_transaction_count_by_hash_request(
    data: &ProviderData,
    block_hash: B256,
) -> Result<Option<U64>, ProviderError> {
    Ok(data
        .block_by_hash(&block_hash)?
        .map(|block| U64::from(block.transactions().len())))
}

pub fn handle_get_block_transaction_count_by_block_number(
    data: &ProviderData,
    block_spec: PreEip1898BlockSpec,
) -> Result<Option<U64>, ProviderError> {
    Ok(block_by_number(data, &block_spec.into())?
        .map(|BlockAndTotalDifficulty { block, .. }| U64::from(block.transactions().len())))
}

fn block_by_number(
    data: &ProviderData,
    block_spec: &BlockSpec,
) -> Result<Option<BlockAndTotalDifficulty>, ProviderError> {
    validate_post_merge_block_tags(data.spec_id(), block_spec)?;

    match data.block_by_block_spec(block_spec) {
        Ok(Some(block)) => {
            let total_difficulty = data.total_difficulty_by_hash(block.hash())?;
            Ok(Some(BlockAndTotalDifficulty {
                block,
                pending: false,
                total_difficulty,
            }))
        }
        // Pending block
        Ok(None) => {
            let result = data.mine_pending_block()?;
            let block: Arc<dyn SyncBlock<Error = BlockchainError>> = Arc::new(result.block);

            let last_block = data.last_block()?;
            let previous_total_difficulty = data
                .total_difficulty_by_hash(last_block.hash())?
                .expect("last block has total difficulty");
            let total_difficulty = previous_total_difficulty + block.header().difficulty;

            Ok(Some(BlockAndTotalDifficulty {
                block,
                pending: true,
                total_difficulty: Some(total_difficulty),
            }))
        }
        Err(ProviderError::InvalidBlockNumberOrHash { .. }) => Ok(None),
        Err(err) => Err(err),
    }
}

fn block_to_rpc_output(
    data: &ProviderData,
    block: Arc<dyn SyncBlock<Error = BlockchainError>>,
    pending: bool,
    total_difficulty: Option<U256>,
    transaction_detail_flag: bool,
) -> Result<eth::Block<HashOrTransaction>, ProviderError> {
    let header = block.header();

    let transactions: Vec<HashOrTransaction> = if transaction_detail_flag {
        block
            .transactions()
            .iter()
            .enumerate()
            .map(|(i, tx)| TransactionAndBlock {
                signed_transaction: tx.clone(),
                block_data: Some(BlockDataForTransaction {
                    block: block.clone(),
                    transaction_index: i.try_into().expect("usize fits into u64"),
                }),
                is_pending: false,
            })
            .map(|tx| {
                transaction_to_rpc_result(tx, data.spec_id()).map(HashOrTransaction::Transaction)
            })
            .collect::<Result<_, _>>()?
    } else {
        block
            .transactions()
            .iter()
            .map(|tx| HashOrTransaction::Hash(*tx.hash()))
            .collect()
    };

    let mix_hash = if pending { None } else { Some(header.mix_hash) };
    let nonce = if pending { None } else { Some(header.nonce) };
    let number = if pending { None } else { Some(header.number) };

    Ok(eth::Block {
        hash: Some(*block.hash()),
        parent_hash: header.parent_hash,
        sha3_uncles: header.ommers_hash,
        state_root: header.state_root,
        transactions_root: header.transactions_root,
        receipts_root: header.receipts_root,
        number,
        gas_used: header.gas_used,
        gas_limit: header.gas_limit,
        extra_data: header.extra_data.clone(),
        logs_bloom: header.logs_bloom,
        timestamp: header.timestamp,
        difficulty: header.difficulty,
        total_difficulty,
        uncles: block.ommer_hashes().to_vec(),
        transactions,
        size: block.rlp_size(),
        mix_hash,
        nonce,
        base_fee_per_gas: header.base_fee_per_gas,
        miner: Some(header.beneficiary),
        withdrawals: block
            .withdrawals()
            .map(<[edr_eth::withdrawal::Withdrawal]>::to_vec),
        withdrawals_root: header.withdrawals_root,
        blob_gas_used: header.blob_gas.as_ref().map(|bg| bg.gas_used),
        excess_blob_gas: header.blob_gas.as_ref().map(|bg| bg.excess_gas),
        parent_beacon_block_root: header.parent_beacon_block_root,
    })
}
