use std::sync::Arc;

use edr_eth::{
    block::Header,
    receipt::BlockReceipt,
    remote,
    remote::PreEip1898BlockSpec,
    serde::ZeroXPrefixedBytes,
    transaction::{EthTransactionRequest, SignedTransaction},
    SpecId, B256, U256,
};
use edr_evm::{blockchain::BlockchainError, SyncBlock};

use crate::{
    data::{BlockDataForTransaction, ProviderData, TransactionAndBlock},
    ProviderError,
};

const FIRST_HARDFORK_WITH_TRANSACTION_TYPE: SpecId = SpecId::BERLIN;

pub fn handle_get_transaction_by_block_hash_and_index(
    data: &ProviderData,
    block_hash: B256,
    index: U256,
) -> Result<Option<remote::eth::Transaction>, ProviderError> {
    let index = rpc_index_to_usize(&index)?;

    data.block_by_hash(&block_hash)?
        .and_then(|block| transaction_from_block(block, index))
        .map(|tx| transaction_to_rpc_result(tx, data.spec_id()))
        .transpose()
}

pub fn handle_get_transaction_by_block_spec_and_index(
    data: &ProviderData,
    block_spec: PreEip1898BlockSpec,
    index: U256,
) -> Result<Option<remote::eth::Transaction>, ProviderError> {
    let index = rpc_index_to_usize(&index)?;

    match data.block_by_block_spec(&block_spec.into()) {
        Ok(Some(block)) => Some(block),
        // Pending block requested
        Ok(None) => {
            let result = data.mine_pending_block()?;
            let block: Arc<dyn SyncBlock<Error = BlockchainError>> = Arc::new(result.block);
            Some(block)
        }
        // Matching Hardhat behavior in returning None for invalid block hash or number.
        Err(ProviderError::InvalidBlockNumberOrHash(_)) => None,
        Err(err) => return Err(err),
    }
    .and_then(|block| transaction_from_block(block, index))
    .map(|tx| transaction_to_rpc_result(tx, data.spec_id()))
    .transpose()
}

fn rpc_index_to_usize(index: &U256) -> Result<usize, ProviderError> {
    index
        .try_into()
        .map_err(|_err| ProviderError::InvalidTransactionIndex(*index))
}

pub fn handle_get_transaction_by_hash(
    data: &ProviderData,
    transaction_hash: B256,
) -> Result<Option<remote::eth::Transaction>, ProviderError> {
    data.transaction_by_hash(&transaction_hash)?
        .map(|tx| transaction_to_rpc_result(tx, data.spec_id()))
        .transpose()
}

pub fn handle_get_transaction_receipt(
    data: &ProviderData,
    transaction_hash: B256,
) -> Result<Option<Arc<BlockReceipt>>, ProviderError> {
    data.transaction_receipt(&transaction_hash)
}

fn transaction_from_block(
    block: Arc<dyn SyncBlock<Error = BlockchainError>>,
    transaction_index: usize,
) -> Option<TransactionAndBlock> {
    block
        .transactions()
        .get(transaction_index)
        .map(|transaction| TransactionAndBlock {
            signed_transaction: transaction.clone(),
            block_data: Some(BlockDataForTransaction {
                block: block.clone(),
                transaction_index: transaction_index.try_into().expect("usize fits into u64"),
            }),
        })
}

pub fn transaction_to_rpc_result(
    transaction_and_block: TransactionAndBlock,
    spec_id: SpecId,
) -> Result<remote::eth::Transaction, ProviderError> {
    fn gas_price_for_post_eip1559(
        signed_transaction: &SignedTransaction,
        block: Option<&Arc<dyn SyncBlock<Error = BlockchainError>>>,
    ) -> U256 {
        let max_fee_per_gas = signed_transaction
            .max_fee_per_gas()
            .expect("Transaction must be post EIP-1559 transaction.");
        let max_priority_fee_per_gas = signed_transaction
            .max_priority_fee_per_gas()
            .expect("Transaction must be post EIP-1559 transaction.");

        if let Some(block) = block {
            let base_fee_per_gas = block.header().base_fee_per_gas.expect(
                "Transaction must have base fee per gas in block metadata if EIP-1559 is active.",
            );
            let priority_fee_per_gas =
                max_priority_fee_per_gas.min(max_fee_per_gas - base_fee_per_gas);
            base_fee_per_gas + priority_fee_per_gas
        } else {
            // We are following Hardhat's behavior of returning the max fee per gas for
            // pending transactions.
            max_fee_per_gas
        }
    }

    let TransactionAndBlock {
        signed_transaction,
        block_data,
    } = transaction_and_block;
    let block = block_data.as_ref().map(|b| &b.block);
    let header = block.map(|b| b.header());

    let gas_price = match &signed_transaction {
        SignedTransaction::PreEip155Legacy(tx) => tx.gas_price,
        SignedTransaction::PostEip155Legacy(tx) => tx.gas_price,
        SignedTransaction::Eip2930(tx) => tx.gas_price,
        SignedTransaction::Eip1559(_) | SignedTransaction::Eip4844(_) => {
            gas_price_for_post_eip1559(&signed_transaction, block)
        }
    };

    let chain_id = match &signed_transaction {
        // Following Hardhat in not returning `chain_id` for `PostEip155Legacy` legacy transactions
        // even though the chain id would be recoverable.
        SignedTransaction::PreEip155Legacy(_) | SignedTransaction::PostEip155Legacy(_) => None,
        SignedTransaction::Eip2930(tx) => Some(tx.chain_id),
        SignedTransaction::Eip1559(tx) => Some(tx.chain_id),
        SignedTransaction::Eip4844(tx) => Some(tx.chain_id),
    };

    let show_transaction_type = spec_id >= FIRST_HARDFORK_WITH_TRANSACTION_TYPE;
    let is_typed_transaction = signed_transaction.transaction_type() > 0;
    let transaction_type = if show_transaction_type || is_typed_transaction {
        Some(signed_transaction.transaction_type())
    } else {
        None
    };

    let signature = signed_transaction.signature();

    Ok(remote::eth::Transaction {
        hash: *signed_transaction.hash(),
        nonce: signed_transaction.nonce(),
        block_hash: header.map(Header::hash),
        block_number: header.map(|h| U256::from(h.number)),
        transaction_index: block_data.as_ref().map(|bd| bd.transaction_index),
        from: signed_transaction.recover()?,
        to: signed_transaction.to(),
        value: signed_transaction.value(),
        gas_price,
        gas: U256::from(signed_transaction.gas_limit()),
        input: signed_transaction.data().clone(),
        v: signature.v,
        // Following Hardhat in always returning `v` instead of `y_parity`.
        y_parity: None,
        r: signature.r,
        s: signature.s,
        chain_id,
        transaction_type,
        access_list: signed_transaction
            .access_list()
            .map(|access_list| access_list.clone().into()),
        max_fee_per_gas: signed_transaction.max_fee_per_gas(),
        max_priority_fee_per_gas: signed_transaction.max_priority_fee_per_gas(),
        max_fee_per_blob_gas: signed_transaction.max_fee_per_blob_gas(),
        blob_versioned_hashes: signed_transaction.blob_hashes(),
    })
}

pub fn handle_send_transaction_request(
    data: &mut ProviderData,
    transaction_request: EthTransactionRequest,
) -> Result<B256, ProviderError> {
    data.send_transaction(transaction_request)
}

pub fn handle_send_raw_transaction_request(
    data: &mut ProviderData,
    raw_transaction: ZeroXPrefixedBytes,
) -> Result<B256, ProviderError> {
    data.send_raw_transaction(raw_transaction.as_ref())
}
