use core::fmt::Debug;
use std::sync::Arc;

use edr_eth::{
    receipt::BlockReceipt,
    remote,
    remote::PreEip1898BlockSpec,
    rlp::Decodable,
    transaction::{
        Eip1559TransactionRequest, Eip155TransactionRequest, Eip2930TransactionRequest,
        EthTransactionRequest, SignedTransaction, TransactionKind, TransactionRequest,
        TransactionRequestAndSender,
    },
    Bytes, SpecId, B256, U256,
};
use edr_evm::{blockchain::BlockchainError, trace::Trace, ExecutableTransaction, SyncBlock};

use crate::{
    data::{BlockDataForTransaction, ProviderData, SendTransactionResult, TransactionAndBlock},
    error::TransactionFailureWithTraces,
    requests::validation::{
        validate_eip3860_max_initcode_size, validate_post_merge_block_tags,
        validate_transaction_and_call_request, validate_transaction_spec,
    },
    ProviderError, TransactionFailure,
};

const FIRST_HARDFORK_WITH_TRANSACTION_TYPE: SpecId = SpecId::BERLIN;

pub fn handle_get_transaction_by_block_hash_and_index<LoggerErrorT: Debug>(
    data: &ProviderData<LoggerErrorT>,
    block_hash: B256,
    index: U256,
) -> Result<Option<remote::eth::Transaction>, ProviderError<LoggerErrorT>> {
    let index = rpc_index_to_usize(&index)?;

    data.block_by_hash(&block_hash)?
        .and_then(|block| transaction_from_block(block, index, false))
        .map(|tx| transaction_to_rpc_result(tx, data.spec_id()))
        .transpose()
}

pub fn handle_get_transaction_by_block_spec_and_index<LoggerErrorT: Debug>(
    data: &ProviderData<LoggerErrorT>,
    block_spec: PreEip1898BlockSpec,
    index: U256,
) -> Result<Option<remote::eth::Transaction>, ProviderError<LoggerErrorT>> {
    validate_post_merge_block_tags(data.spec_id(), &block_spec)?;

    let index = rpc_index_to_usize(&index)?;

    match data.block_by_block_spec(&block_spec.into()) {
        Ok(Some(block)) => Some((block, false)),
        // Pending block requested
        Ok(None) => {
            let result = data.mine_pending_block()?;
            let block: Arc<dyn SyncBlock<Error = BlockchainError>> = Arc::new(result.block);
            Some((block, true))
        }
        // Matching Hardhat behavior in returning None for invalid block hash or number.
        Err(ProviderError::InvalidBlockNumberOrHash { .. }) => None,
        Err(err) => return Err(err),
    }
    .and_then(|(block, is_pending)| transaction_from_block(block, index, is_pending))
    .map(|tx| transaction_to_rpc_result(tx, data.spec_id()))
    .transpose()
}

pub fn handle_pending_transactions<LoggerErrorT: Debug>(
    data: &ProviderData<LoggerErrorT>,
) -> Result<Vec<remote::eth::Transaction>, ProviderError<LoggerErrorT>> {
    let spec_id = data.spec_id();
    data.pending_transactions()
        .map(|pending_transaction| {
            let transaction_and_block = TransactionAndBlock {
                signed_transaction: pending_transaction.as_inner().clone(),
                block_data: None,
                is_pending: true,
            };
            transaction_to_rpc_result(transaction_and_block, spec_id)
        })
        .collect()
}

fn rpc_index_to_usize<LoggerErrorT: Debug>(
    index: &U256,
) -> Result<usize, ProviderError<LoggerErrorT>> {
    index
        .try_into()
        .map_err(|_err| ProviderError::InvalidTransactionIndex(*index))
}

pub fn handle_get_transaction_by_hash<LoggerErrorT: Debug>(
    data: &ProviderData<LoggerErrorT>,
    transaction_hash: B256,
) -> Result<Option<remote::eth::Transaction>, ProviderError<LoggerErrorT>> {
    data.transaction_by_hash(&transaction_hash)?
        .map(|tx| transaction_to_rpc_result(tx, data.spec_id()))
        .transpose()
}

pub fn handle_get_transaction_receipt<LoggerErrorT: Debug>(
    data: &ProviderData<LoggerErrorT>,
    transaction_hash: B256,
) -> Result<Option<Arc<BlockReceipt>>, ProviderError<LoggerErrorT>> {
    data.transaction_receipt(&transaction_hash)
}

fn transaction_from_block(
    block: Arc<dyn SyncBlock<Error = BlockchainError>>,
    transaction_index: usize,
    is_pending: bool,
) -> Option<TransactionAndBlock> {
    block
        .transactions()
        .get(transaction_index)
        .map(|transaction| TransactionAndBlock {
            signed_transaction: transaction.as_inner().clone(),
            block_data: Some(BlockDataForTransaction {
                block: block.clone(),
                transaction_index: transaction_index.try_into().expect("usize fits into u64"),
            }),
            is_pending,
        })
}

pub fn transaction_to_rpc_result<LoggerErrorT: Debug>(
    transaction_and_block: TransactionAndBlock,
    spec_id: SpecId,
) -> Result<remote::eth::Transaction, ProviderError<LoggerErrorT>> {
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
        is_pending,
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
    let (block_hash, block_number) = if is_pending {
        (None, None)
    } else {
        header
            .map(|header| (header.hash(), U256::from(header.number)))
            .unzip()
    };

    let transaction_index = if is_pending {
        None
    } else {
        block_data.as_ref().map(|bd| bd.transaction_index)
    };

    Ok(remote::eth::Transaction {
        hash: *signed_transaction.hash(),
        nonce: signed_transaction.nonce(),
        block_hash,
        block_number,
        transaction_index,
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

pub fn handle_send_transaction_request<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    transaction_request: EthTransactionRequest,
) -> Result<(B256, Vec<Trace>), ProviderError<LoggerErrorT>> {
    validate_send_transaction_request(data, &transaction_request)?;

    let transaction_request = resolve_transaction_request(data, transaction_request)?;
    let signed_transaction = data.sign_transaction_request(transaction_request)?;

    send_raw_transaction_and_log(data, signed_transaction)
}

pub fn handle_send_raw_transaction_request<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    raw_transaction: Bytes,
) -> Result<(B256, Vec<Trace>), ProviderError<LoggerErrorT>> {
    let mut raw_transaction: &[u8] = raw_transaction.as_ref();
    let signed_transaction =
        SignedTransaction::decode(&mut raw_transaction).map_err(|err| match err {
            edr_eth::rlp::Error::Custom(message) if SignedTransaction::is_invalid_transaction_type_error(message) => {
                let type_id = *raw_transaction.first().expect("We already validated that the transaction is not empty if it's an invalid transaction type error.");
                ProviderError::InvalidTransactionType(type_id)
            }
            err => ProviderError::InvalidArgument(err.to_string()),
        })?;

    validate_send_raw_transaction_request(data, &signed_transaction)?;

    let pending_transaction = ExecutableTransaction::new(data.spec_id(), signed_transaction)?;

    send_raw_transaction_and_log(data, pending_transaction)
}

fn resolve_transaction_request<LoggerErrorT: Debug>(
    data: &ProviderData<LoggerErrorT>,
    transaction_request: EthTransactionRequest,
) -> Result<TransactionRequestAndSender, ProviderError<LoggerErrorT>> {
    const DEFAULT_MAX_PRIORITY_FEE_PER_GAS: u64 = 1_000_000_000;

    /// # Panics
    ///
    /// Panics if `data.spec_id()` is less than `SpecId::LONDON`.
    fn calculate_max_fee_per_gas<LoggerErrorT: Debug>(
        data: &ProviderData<LoggerErrorT>,
        max_priority_fee_per_gas: U256,
    ) -> Result<U256, BlockchainError> {
        let base_fee_per_gas = data
            .next_block_base_fee_per_gas()?
            .expect("We already validated that the block is post-London.");
        Ok(U256::from(2) * base_fee_per_gas + max_priority_fee_per_gas)
    }

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
        chain_id,
        access_list,
        // We ignore the transaction type
        transaction_type: _transaction_type,
    } = transaction_request;

    let chain_id = chain_id.unwrap_or_else(|| data.chain_id());
    let gas_limit = gas.unwrap_or_else(|| data.block_gas_limit());
    let input = input.map_or(Bytes::new(), Into::into);
    let nonce = nonce.map_or_else(|| data.account_next_nonce(&from), Ok)?;
    let value = value.unwrap_or(U256::ZERO);

    let request = match (
        gas_price,
        max_fee_per_gas,
        max_priority_fee_per_gas,
        access_list,
    ) {
        (gas_price, max_fee_per_gas, max_priority_fee_per_gas, access_list)
            if data.spec_id() >= SpecId::LONDON
                && (gas_price.is_none()
                    || max_fee_per_gas.is_some()
                    || max_priority_fee_per_gas.is_some()) =>
        {
            let (max_fee_per_gas, max_priority_fee_per_gas) =
                match (max_fee_per_gas, max_priority_fee_per_gas) {
                    (Some(max_fee_per_gas), Some(max_priority_fee_per_gas)) => {
                        (max_fee_per_gas, max_priority_fee_per_gas)
                    }
                    (Some(max_fee_per_gas), None) => (
                        max_fee_per_gas,
                        max_fee_per_gas.min(U256::from(DEFAULT_MAX_PRIORITY_FEE_PER_GAS)),
                    ),
                    (None, Some(max_priority_fee_per_gas)) => {
                        let max_fee_per_gas =
                            calculate_max_fee_per_gas(data, max_priority_fee_per_gas)?;
                        (max_fee_per_gas, max_priority_fee_per_gas)
                    }
                    (None, None) => {
                        let max_priority_fee_per_gas = U256::from(DEFAULT_MAX_PRIORITY_FEE_PER_GAS);
                        let max_fee_per_gas =
                            calculate_max_fee_per_gas(data, max_priority_fee_per_gas)?;
                        (max_fee_per_gas, max_priority_fee_per_gas)
                    }
                };

            TransactionRequest::Eip1559(Eip1559TransactionRequest {
                nonce,
                max_priority_fee_per_gas,
                max_fee_per_gas,
                gas_limit,
                value,
                input,
                kind: match to {
                    Some(to) => TransactionKind::Call(to),
                    None => TransactionKind::Create,
                },
                chain_id,
                access_list: access_list.unwrap_or_default(),
            })
        }
        (gas_price, _, _, Some(access_list)) => {
            TransactionRequest::Eip2930(Eip2930TransactionRequest {
                nonce,
                gas_price: gas_price.map_or_else(|| data.next_gas_price(), Ok)?,
                gas_limit,
                value,
                input,
                kind: match to {
                    Some(to) => TransactionKind::Call(to),
                    None => TransactionKind::Create,
                },
                chain_id,
                access_list,
            })
        }
        (gas_price, _, _, _) => TransactionRequest::Eip155(Eip155TransactionRequest {
            nonce,
            gas_price: gas_price.map_or_else(|| data.next_gas_price(), Ok)?,
            gas_limit,
            value,
            input,
            kind: match to {
                Some(to) => TransactionKind::Call(to),
                None => TransactionKind::Create,
            },
            chain_id,
        }),
    };

    Ok(TransactionRequestAndSender {
        request,
        sender: from,
    })
}

fn send_raw_transaction_and_log<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    signed_transaction: ExecutableTransaction,
) -> Result<(B256, Vec<Trace>), ProviderError<LoggerErrorT>> {
    let SendTransactionResult {
        transaction_hash,
        transaction_result,
        mining_results,
    } = data.send_transaction(signed_transaction.clone())?;

    let spec_id = data.spec_id();
    data.logger_mut()
        .log_send_transaction(spec_id, &signed_transaction, &mining_results)
        .map_err(ProviderError::Logger)?;

    let traces = mining_results
        .into_iter()
        .flat_map(|result| result.transaction_traces)
        .collect();

    if data.bail_on_transaction_failure() {
        let transaction_failure = transaction_result.and_then(|(result, trace)| {
            TransactionFailure::from_execution_result(&result, &transaction_hash, &trace)
        });

        if let Some(failure) = transaction_failure {
            return Err(ProviderError::TransactionFailed(
                TransactionFailureWithTraces { failure, traces },
            ));
        }
    }

    Ok((transaction_hash, traces))
}

fn validate_send_transaction_request<LoggerErrorT: Debug>(
    data: &ProviderData<LoggerErrorT>,
    request: &EthTransactionRequest,
) -> Result<(), ProviderError<LoggerErrorT>> {
    if let Some(chain_id) = request.chain_id {
        let expected = data.chain_id();
        if chain_id != expected {
            return Err(ProviderError::InvalidChainId {
                expected,
                actual: chain_id,
            });
        }
    }

    if let Some(request_data) = &request.data {
        validate_eip3860_max_initcode_size(
            data.spec_id(),
            data.allow_unlimited_initcode_size(),
            &request.to,
            request_data,
        )?;
    }

    validate_transaction_and_call_request(data.spec_id(), request)
}

fn validate_send_raw_transaction_request<LoggerErrorT: Debug>(
    data: &ProviderData<LoggerErrorT>,
    signed_transaction: &SignedTransaction,
) -> Result<(), ProviderError<LoggerErrorT>> {
    // Validate signature
    let _ = signed_transaction
        .recover()
        .map_err(|_err| ProviderError::InvalidArgument("Invalid Signature".into()))?;

    if let Some(tx_chain_id) = signed_transaction.chain_id() {
        let expected = data.chain_id();
        if tx_chain_id != expected {
            let error = if signed_transaction.is_eip155() {
                ProviderError::InvalidEip155TransactionChainId
            } else {
                ProviderError::InvalidArgument(format!("Trying to send a raw transaction with an invalid chainId. The expected chainId is {expected}"))
            };
            return Err(error);
        }
    }

    validate_transaction_spec(data.spec_id(), signed_transaction.into()).map_err(
        |err| match err {
            ProviderError::UnsupportedEIP1559Parameters {
                minimum_hardfork, ..
            } => ProviderError::InvalidArgument(format!(
                "\
Trying to send an EIP-1559 transaction but they are not supported by the current hard fork.\
\
You can use them by running Hardhat Network with 'hardfork' {minimum_hardfork:?} or later."
            )),
            err => err,
        },
    )?;

    validate_eip3860_max_initcode_size(
        data.spec_id(),
        data.allow_unlimited_initcode_size(),
        &signed_transaction.to(),
        signed_transaction.data(),
    )?;

    validate_transaction_and_call_request(data.spec_id(), signed_transaction)
}
