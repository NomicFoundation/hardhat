use edr_eth::{
    remote::{eth::CallRequest, BlockSpec, StateOverrideOptions},
    transaction::{
        Eip1559TransactionRequest, Eip155TransactionRequest, Eip2930TransactionRequest,
        TransactionRequest,
    },
    Bytes, SpecId, U256,
};
use edr_evm::{state::StateOverrides, PendingTransaction};

use crate::{data::ProviderData, requests::validation::validate_call_request, ProviderError};

pub fn handle_call_request(
    data: &ProviderData,
    request: CallRequest,
    block_spec: Option<BlockSpec>,
    state_overrides: Option<StateOverrideOptions>,
) -> Result<Bytes, ProviderError> {
    validate_call_request(data.spec_id(), &request, &block_spec)?;

    let state_overrides =
        state_overrides.map_or(Ok(StateOverrides::default()), StateOverrides::try_from)?;

    let transaction = resolve_call_request(data, request, block_spec.as_ref(), &state_overrides)?;
    data.run_call(transaction, block_spec.as_ref(), &state_overrides)
}

fn resolve_call_request(
    data: &ProviderData,
    request: CallRequest,
    block_spec: Option<&BlockSpec>,
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
    let gas_limit = gas.unwrap_or_else(|| data.block_gas_limit());
    let input = input.map_or(Bytes::new(), Bytes::from);
    let nonce = data.nonce(&from, block_spec, state_overrides)?;
    let value = value.unwrap_or(U256::ZERO);

    let transaction = if data.spec_id() < SpecId::LONDON || gas_price.is_some() {
        match access_list {
            Some(access_list) if data.spec_id() >= SpecId::BERLIN => {
                TransactionRequest::Eip2930(Eip2930TransactionRequest {
                    nonce,
                    gas_price: gas_price.unwrap_or(U256::ZERO),
                    gas_limit,
                    value,
                    input,
                    kind: to.into(),
                    chain_id,
                    access_list,
                })
            }
            _ => TransactionRequest::Eip155(Eip155TransactionRequest {
                nonce,
                gas_price: gas_price.unwrap_or(U256::ZERO),
                gas_limit,
                kind: to.into(),
                value,
                input,
                chain_id,
            }),
        }
    } else {
        let max_fee_per_gas = max_fee_per_gas
            .or(max_priority_fee_per_gas)
            .unwrap_or(U256::ZERO);

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
    PendingTransaction::with_caller(data.spec_id(), transaction, from)
        .map_err(ProviderError::TransactionCreationError)
}
