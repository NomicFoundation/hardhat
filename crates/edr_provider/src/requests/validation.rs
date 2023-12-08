use edr_eth::{
    access_list::AccessListItem, remote::methods::CallRequest, transaction::EthTransactionRequest,
    SpecId, U256,
};

use crate::ProviderError;

/// Data used for validating a transaction complies with a [`SpecId`].
pub struct SpecValidationData<'data> {
    pub gas_price: &'data Option<U256>,
    pub max_fee_per_gas: &'data Option<U256>,
    pub max_priority_fee_per_gas: &'data Option<U256>,
    pub access_list: &'data Option<Vec<AccessListItem>>,
}

impl<'data> From<&'data EthTransactionRequest> for SpecValidationData<'data> {
    fn from(value: &'data EthTransactionRequest) -> Self {
        Self {
            gas_price: &value.gas_price,
            max_fee_per_gas: &value.max_fee_per_gas,
            max_priority_fee_per_gas: &value.max_priority_fee_per_gas,
            access_list: &value.access_list,
        }
    }
}

impl<'data> From<&'data CallRequest> for SpecValidationData<'data> {
    fn from(value: &'data CallRequest) -> Self {
        Self {
            gas_price: &value.gas_price,
            max_fee_per_gas: &value.max_fee_per_gas,
            max_priority_fee_per_gas: &value.max_priority_fee_per_gas,
            access_list: &value.access_list,
        }
    }
}

pub fn validate_transaction_spec(
    spec_id: SpecId,
    data: SpecValidationData<'_>,
) -> Result<(), ProviderError> {
    let SpecValidationData {
        gas_price,
        max_fee_per_gas,
        max_priority_fee_per_gas,
        access_list,
    } = data;

    if spec_id < SpecId::LONDON && (max_fee_per_gas.is_some() || max_priority_fee_per_gas.is_some())
    {
        return Err(ProviderError::UnmetHardfork {
            actual: spec_id,
            minimum: SpecId::LONDON,
        });
    }

    if spec_id < SpecId::BERLIN && access_list.is_some() {
        return Err(ProviderError::UnmetHardfork {
            actual: spec_id,
            minimum: SpecId::BERLIN,
        });
    }

    if gas_price.is_some() {
        if max_fee_per_gas.is_some() {
            return Err(ProviderError::InvalidTransactionInput(
                "Cannot send both gasPrice and maxFeePerGas params".to_string(),
            ));
        }

        if max_priority_fee_per_gas.is_some() {
            return Err(ProviderError::InvalidTransactionInput(
                "Cannot send both gasPrice and maxPriorityFeePerGas".to_string(),
            ));
        }
    }

    if let Some(max_fee_per_gas) = max_fee_per_gas {
        if let Some(max_priority_fee_per_gas) = max_priority_fee_per_gas {
            if max_priority_fee_per_gas > max_fee_per_gas {
                return Err(ProviderError::InvalidTransactionInput(format!(
                    "maxPriorityFeePerGas ({max_priority_fee_per_gas}) is bigger than maxFeePerGas ({max_fee_per_gas})"),
                ));
            }
        }
    }

    Ok(())
}
