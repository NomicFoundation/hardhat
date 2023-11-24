use std::sync::Arc;

use edr_eth::{
    receipt::BlockReceipt,
    remote,
    remote::PreEip1898BlockSpec,
    serde::ZeroXPrefixedBytes,
    transaction::{
        Eip1559TransactionRequest, Eip2930TransactionRequest, EthTransactionRequest,
        LegacyTransactionRequest, SignedTransaction, TransactionKind, TransactionRequest,
        TransactionRequestAndSender,
    },
    SpecId, B256, U256,
};
use edr_evm::{blockchain::BlockchainError, SyncBlock};

use crate::{
    data::{
        transaction_from_block, BlockMetadataForTransaction, GetTransactionResult, ProviderData,
    },
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
        .and_then(|block| transaction_from_block(&block, index, data.spec_id()))
        .map(get_transaction_result_to_rpc_result)
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
    .and_then(|block| transaction_from_block(&block, index, data.spec_id()))
    .map(get_transaction_result_to_rpc_result)
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
        .map(get_transaction_result_to_rpc_result)
        .transpose()
}

pub fn handle_get_transaction_receipt(
    data: &ProviderData,
    transaction_hash: B256,
) -> Result<Option<Arc<BlockReceipt>>, ProviderError> {
    data.transaction_receipt(&transaction_hash)
}

fn get_transaction_result_to_rpc_result(
    result: GetTransactionResult,
) -> Result<remote::eth::Transaction, ProviderError> {
    fn gas_price_for_post_eip1559(
        signed_transaction: &SignedTransaction,
        block_metadata: Option<&BlockMetadataForTransaction>,
    ) -> U256 {
        let max_fee_per_gas = signed_transaction
            .max_fee_per_gas()
            .expect("Transaction must be post EIP-1559 transaction.");
        let max_priority_fee_per_gas = signed_transaction
            .max_priority_fee_per_gas()
            .expect("Transaction must be post EIP-1559 transaction.");

        if let Some(block_metadata) = block_metadata {
            let base_fee_per_gas = block_metadata.base_fee_per_gas.expect(
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

    let GetTransactionResult {
        signed_transaction,
        spec_id,
        block_metadata,
    } = result;

    let gas_price = match &signed_transaction {
        SignedTransaction::PreEip155Legacy(tx) => tx.gas_price,
        SignedTransaction::PostEip155Legacy(tx) => tx.gas_price,
        SignedTransaction::Eip2930(tx) => tx.gas_price,
        SignedTransaction::Eip1559(_) | SignedTransaction::Eip4844(_) => {
            gas_price_for_post_eip1559(&signed_transaction, block_metadata.as_ref())
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
        block_hash: block_metadata.as_ref().map(|m| m.block_hash),
        block_number: block_metadata.as_ref().map(|m| U256::from(m.block_number)),
        transaction_index: block_metadata.map(|m| m.transaction_index),
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
    let transaction_request = resolve_transaction_request(data, transaction_request)?;

    data.send_transaction(transaction_request)
}

pub fn handle_send_raw_transaction_request(
    data: &mut ProviderData,
    raw_transaction: ZeroXPrefixedBytes,
) -> Result<B256, ProviderError> {
    data.send_raw_transaction(raw_transaction.as_ref())
}

fn resolve_transaction_request(
    data: &ProviderData,
    transaction_request: EthTransactionRequest,
) -> Result<TransactionRequestAndSender, ProviderError> {
    let EthTransactionRequest {
        from,
        to,
        gas_price,
        max_fee_per_gas,
        max_priority_fee_per_gas,
        gas,
        value,
        data: input,
        nonce,
        mut access_list,
        ..
    } = transaction_request;

    let gas_limit = gas.unwrap_or_else(|| data.block_gas_limit());
    let input = input.unwrap_or_default();
    let nonce = nonce.unwrap_or_else(|| data.account_last_pending_nonce(&from).unwrap_or(0));
    let value = value.unwrap_or(U256::ZERO);

    let request = match (gas_price, max_fee_per_gas, access_list.take()) {
        // legacy transaction
        (Some(_), None, None) => Some(TransactionRequest::Legacy(LegacyTransactionRequest {
            nonce,
            gas_price: gas_price.unwrap_or_default(),
            gas_limit,
            value,
            input,
            kind: match to {
                Some(to) => TransactionKind::Call(to),
                None => TransactionKind::Create,
            },
        })),
        // EIP2930
        (_, None, Some(access_list)) => {
            Some(TransactionRequest::Eip2930(Eip2930TransactionRequest {
                nonce,
                gas_price: gas_price.unwrap_or_default(),
                gas_limit,
                value,
                input,
                kind: match to {
                    Some(to) => TransactionKind::Call(to),
                    None => TransactionKind::Create,
                },
                chain_id: 0,
                access_list,
            }))
        }
        // EIP1559
        (None, Some(_), access_list) | (None, None, access_list @ None) => {
            // Empty fields fall back to the canonical transaction schema.
            Some(TransactionRequest::Eip1559(Eip1559TransactionRequest {
                nonce,
                max_fee_per_gas: max_fee_per_gas.unwrap_or_default(),
                max_priority_fee_per_gas: max_priority_fee_per_gas.unwrap_or(U256::ZERO),
                gas_limit,
                value,
                input,
                kind: match to {
                    Some(to) => TransactionKind::Call(to),
                    None => TransactionKind::Create,
                },
                chain_id: 0,
                access_list: access_list.unwrap_or_default(),
            }))
        }
        _ => None,
    };

    request
        .ok_or_else(|| ProviderError::InvalidTransactionRequest)
        .map(|request| TransactionRequestAndSender {
            request,
            sender: from,
        })
}
