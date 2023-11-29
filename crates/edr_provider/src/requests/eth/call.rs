use edr_eth::{
    remote::{methods::CallRequest, BlockSpec, StateOverrideOptions},
    serde::ZeroXPrefixedBytes,
    transaction::{Eip1559TransactionRequest, Eip155TransactionRequest, TransactionRequest},
    Bytes, SpecId, U256,
};
use edr_evm::{
    db::StateRef,
    state::{StateOverrides, StateRefOverrider},
    PendingTransaction,
};

use crate::{data::ProviderData, ProviderError};

pub fn handle_call_request(
    data: &ProviderData,
    request: CallRequest,
    block_spec: Option<BlockSpec>,
    state_overrides: Option<StateOverrideOptions>,
) -> Result<ZeroXPrefixedBytes, ProviderError> {
    // Does validation need overriden state?
    validate_call_request(&request)?;

    let state_overrides =
        state_overrides.map_or(Ok(StateOverrides::default()), StateOverrides::try_from)?;

    let transaction = resolve_call_request(data, request, &state_overrides)?;
    data.run_call(transaction, block_spec.as_ref(), &state_overrides)
        .map(ZeroXPrefixedBytes::from)
}

fn resolve_call_request(
    data: &ProviderData,
    request: CallRequest,
    state_overrides: &StateOverrides,
) -> Result<PendingTransaction, ProviderError> {
    let CallRequest {
        from,
        to,
        gas,
        gas_price,
        max_fee_per_gas,
        max_priority_fee_per_gas,
        value,
        data: input,
        access_list,
    } = request;

    let chain_id = data.chain_id();
    let from = from.unwrap_or_else(|| data.default_caller());
    let input = input.map_or(Bytes::new(), Bytes::from);
    let gas_limit = gas.unwrap_or_else(|| data.block_gas_limit());
    let value = value.unwrap_or(U256::ZERO);

    let state_overrider = StateRefOverrider::new(state_overrides, data.state());
    let nonce = state_overrider
        .basic(from)?
        .map_or(0, |account_info| account_info.nonce);

    let transaction = if data.spec_id() < SpecId::LONDON || gas_price.is_some() {
        TransactionRequest::Eip155(Eip155TransactionRequest {
            nonce,
            // Question: Why is this always zero? Shouldn't it be the gas price?
            gas_price: U256::ZERO,
            gas_limit,
            kind: to.into(),
            value,
            input,
            chain_id,
        })
    } else {
        // Question: Is there a reason we don't support EIP-2930 calls?
        let max_fee_per_gas = max_fee_per_gas.unwrap_or(U256::ZERO);
        let max_priority_fee_per_gas = max_priority_fee_per_gas.unwrap_or(U256::ZERO);

        TransactionRequest::Eip1559(Eip1559TransactionRequest {
            chain_id,
            nonce,
            max_fee_per_gas,
            max_priority_fee_per_gas,
            gas_limit,
            kind: to.into(),
            value,
            input,
            access_list: access_list.unwrap_or_default(),
        })
    };

    let transaction = transaction.fake_sign(&from);
    PendingTransaction::with_caller(&state_overrider, data.spec_id(), transaction, from)
        .map_err(ProviderError::TransactionCreationError)
}

fn validate_call_request(_request: &CallRequest) -> Result<(), ProviderError> {
    // TODO

    Ok(())
}
