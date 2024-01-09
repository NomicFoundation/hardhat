use edr_eth::{
    access_list::AccessListItem,
    remote::{eth::CallRequest, BlockSpec, BlockTag, PreEip1898BlockSpec},
    transaction::{EthTransactionRequest, SignedTransaction},
    SpecId, U256,
};

use crate::ProviderError;

/// Data used for validating a transaction complies with a [`SpecId`].
pub struct SpecValidationData<'data> {
    pub gas_price: Option<&'data U256>,
    pub max_fee_per_gas: Option<&'data U256>,
    pub max_priority_fee_per_gas: Option<&'data U256>,
    pub access_list: Option<&'data Vec<AccessListItem>>,
}

impl<'data> From<&'data EthTransactionRequest> for SpecValidationData<'data> {
    fn from(value: &'data EthTransactionRequest) -> Self {
        Self {
            gas_price: value.gas_price.as_ref(),
            max_fee_per_gas: value.max_fee_per_gas.as_ref(),
            max_priority_fee_per_gas: value.max_priority_fee_per_gas.as_ref(),
            access_list: value.access_list.as_ref(),
        }
    }
}

impl<'data> From<&'data CallRequest> for SpecValidationData<'data> {
    fn from(value: &'data CallRequest) -> Self {
        Self {
            gas_price: value.gas_price.as_ref(),
            max_fee_per_gas: value.max_fee_per_gas.as_ref(),
            max_priority_fee_per_gas: value.max_priority_fee_per_gas.as_ref(),
            access_list: value.access_list.as_ref(),
        }
    }
}

impl<'data> From<&'data SignedTransaction> for SpecValidationData<'data> {
    fn from(value: &'data SignedTransaction) -> Self {
        match value {
            SignedTransaction::PreEip155Legacy(tx) => Self {
                gas_price: Some(&tx.gas_price),
                max_fee_per_gas: None,
                max_priority_fee_per_gas: None,
                access_list: None,
            },
            SignedTransaction::PostEip155Legacy(tx) => Self {
                gas_price: Some(&tx.gas_price),
                max_fee_per_gas: None,
                max_priority_fee_per_gas: None,
                access_list: None,
            },
            SignedTransaction::Eip2930(tx) => Self {
                gas_price: Some(&tx.gas_price),
                max_fee_per_gas: None,
                max_priority_fee_per_gas: None,
                access_list: Some(tx.access_list.0.as_ref()),
            },
            SignedTransaction::Eip1559(tx) => Self {
                gas_price: None,
                max_fee_per_gas: Some(&tx.max_fee_per_gas),
                max_priority_fee_per_gas: Some(&tx.max_priority_fee_per_gas),
                access_list: Some(tx.access_list.0.as_ref()),
            },
            SignedTransaction::Eip4844(tx) => Self {
                gas_price: None,
                max_fee_per_gas: Some(&tx.max_fee_per_gas),
                max_priority_fee_per_gas: Some(&tx.max_priority_fee_per_gas),
                access_list: Some(tx.access_list.0.as_ref()),
            },
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

pub enum ValidationBlockSpec<'a> {
    PreEip1898(&'a PreEip1898BlockSpec),
    PostEip1898(&'a BlockSpec),
}

impl<'a> From<&'a PreEip1898BlockSpec> for ValidationBlockSpec<'a> {
    fn from(value: &'a PreEip1898BlockSpec) -> Self {
        Self::PreEip1898(value)
    }
}

impl<'a> From<&'a BlockSpec> for ValidationBlockSpec<'a> {
    fn from(value: &'a BlockSpec) -> Self {
        Self::PostEip1898(value)
    }
}

pub fn validate_post_merge_block_tags<'a>(
    hardfork: SpecId,
    block_spec: impl Into<ValidationBlockSpec<'a>>,
) -> Result<(), ProviderError> {
    let block_spec: ValidationBlockSpec<'a> = block_spec.into();

    if hardfork < SpecId::MERGE {
        match block_spec {
            ValidationBlockSpec::PreEip1898(PreEip1898BlockSpec::Tag(
                tag @ (BlockTag::Safe | BlockTag::Finalized),
            ))
            | ValidationBlockSpec::PostEip1898(BlockSpec::Tag(
                tag @ (BlockTag::Safe | BlockTag::Finalized),
            )) => {
                return Err(ProviderError::InvalidArgument(format!(
                    "The '{tag}' block tag is not allowed in pre-merge hardforks. You are using the '{hardfork:?}' hardfork."
                )));
            }
            _ => (),
        }
    }
    Ok(())
}
