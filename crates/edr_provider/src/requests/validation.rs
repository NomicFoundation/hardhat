use edr_eth::{
    access_list::AccessListItem,
    remote::{eth::CallRequest, BlockSpec, BlockTag, PreEip1898BlockSpec},
    transaction::{EthTransactionRequest, SignedTransaction},
    Address, SpecId, U256,
};
use edr_evm::Bytes;

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
        return Err(ProviderError::UnsupportedEIP1559Parameters {
            current_hardfork: spec_id,
            minimum_hardfork: SpecId::BERLIN,
        });
    }

    if spec_id < SpecId::BERLIN && access_list.is_some() {
        return Err(ProviderError::UnsupportedAccessListParameter {
            current_hardfork: spec_id,
            minimum_hardfork: SpecId::BERLIN,
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

pub fn validate_call_request(
    spec_id: SpecId,
    call_request: &CallRequest,
    block_spec: &Option<BlockSpec>,
) -> Result<(), ProviderError> {
    if let Some(ref block_spec) = block_spec {
        validate_post_merge_block_tags(spec_id, block_spec)?;
    }

    validate_transaction_and_call_request(
        spec_id,
        <&CallRequest as Into<SpecValidationData<'_>>>::into(call_request),
    )
}

pub fn validate_transaction_and_call_request<'a>(
    spec_id: SpecId,
    validation_data: impl Into<SpecValidationData<'a>>,
) -> Result<(), ProviderError> {
    validate_transaction_spec(spec_id, validation_data.into()).map_err(|err| match err {
        ProviderError::UnsupportedAccessListParameter {
            minimum_hardfork, ..
        } => ProviderError::InvalidArgument(format!("\
Access list received but is not supported by the current hardfork. 

You can use them by running Hardhat Network with 'hardfork' {minimum_hardfork:?} or later.
        ")),
        ProviderError::UnsupportedEIP1559Parameters {
            minimum_hardfork, ..
        } => ProviderError::InvalidArgument(format!("\
EIP-1559 style fee params (maxFeePerGas or maxPriorityFeePerGas) received but they are not supported by the current hardfork.

You can use them by running Hardhat Network with 'hardfork' {minimum_hardfork:?} or later.
        ")),
        err => err,
    })
}

pub fn validate_eip3860_max_initcode_size(
    spec_id: SpecId,
    allow_unlimited_contract_code_size: bool,
    to: &Option<Address>,
    data: &Bytes,
) -> Result<(), ProviderError> {
    if spec_id < SpecId::SHANGHAI || to.is_some() || allow_unlimited_contract_code_size {
        return Ok(());
    }

    if data.len() > edr_evm::MAX_INITCODE_SIZE {
        return Err(ProviderError::InvalidArgument(format!("
Trying to send a deployment transaction whose init code length is {}. The max length allowed by EIP-3860 is {}.

Enable the 'allowUnlimitedContractSize' option to allow init codes of any length.", data.len(), edr_evm::MAX_INITCODE_SIZE)));
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
