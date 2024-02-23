use core::fmt::Debug;

use dyn_clone::DynClone;
use edr_eth::{Address, Bytes};
use edr_evm::{CallInputs, EVMData, Gas, Inspector, InstructionResult, TransactTo};

use crate::data::CONSOLE_ADDRESS;

/// The result of executing a call override.
#[derive(Debug)]
pub struct CallOverrideResult {
    pub result: Bytes,
    pub should_revert: bool,
    pub gas: u64,
}

pub trait SyncCallOverride:
    Fn(Address, Bytes) -> Option<CallOverrideResult> + DynClone + Send + Sync
{
}

impl<F> SyncCallOverride for F where
    F: Fn(Address, Bytes) -> Option<CallOverrideResult> + DynClone + Send + Sync
{
}

dyn_clone::clone_trait_object!(SyncCallOverride);

pub(super) struct EvmInspector {
    console_log_encoded_messages: Vec<Bytes>,
    call_override: Option<Box<dyn SyncCallOverride>>,
}

impl EvmInspector {
    pub fn new(call_override: Option<Box<dyn SyncCallOverride>>) -> Self {
        Self {
            console_log_encoded_messages: Vec::new(),
            call_override,
        }
    }

    pub fn into_console_log_encoded_messages(self) -> Vec<Bytes> {
        self.console_log_encoded_messages
    }
}

impl Debug for EvmInspector {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("EvmInspector")
            .field(
                "console_log_encoded_messages",
                &self.console_log_encoded_messages,
            )
            .field("call_override", &"<closure>")
            .finish()
    }
}

impl<DatabaseErrorT> Inspector<DatabaseErrorT> for EvmInspector {
    fn call(
        &mut self,
        data: &mut EVMData<'_, DatabaseErrorT>,
        inputs: &mut CallInputs,
    ) -> (InstructionResult, Gas, Bytes) {
        if inputs.contract == *CONSOLE_ADDRESS {
            self.console_log_encoded_messages.push(inputs.input.clone());
        }

        if let TransactTo::Call(_) = data.env.tx.transact_to {
            if let Some(call_override) = &self.call_override {
                let out = (call_override)(inputs.contract, inputs.input.clone());
                if let Some(out) = out {
                    let instruction_result = if out.should_revert {
                        InstructionResult::Revert
                    } else {
                        InstructionResult::Return
                    };

                    return (instruction_result, Gas::new(out.gas), out.result);
                }
            }
        }

        (
            InstructionResult::Continue,
            Gas::new(inputs.gas_limit),
            Bytes::new(),
        )
    }
}

#[cfg(test)]
pub(crate) mod tests {

    use core::fmt::Debug;

    use anyhow::Context;
    use edr_eth::{
        transaction::{
            Eip1559TransactionRequest, TransactionKind, TransactionRequest,
            TransactionRequestAndSender,
        },
        Bytes, U256,
    };
    use edr_evm::hex;

    use crate::data::ProviderData;

    pub struct ConsoleLogTransaction {
        pub transaction: TransactionRequestAndSender,
        pub expected_call_data: Bytes,
    }

    pub fn deploy_console_log_contract<LoggerErrorT: Debug + Send + Sync + 'static>(
        provider_data: &mut ProviderData<LoggerErrorT>,
    ) -> anyhow::Result<ConsoleLogTransaction> {
        // Compiled with solc 0.8.17, without optimizations
        /*
        // SPDX-License-Identifier: MIT
        pragma solidity ^0.8.0;

        import "hardhat/console.sol";

        contract Foo {
          function f() public pure {
            console.log("hello");
          }
        }
        */
        let byte_code = hex::decode("608060405234801561001057600080fd5b5061027a806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c806326121ff014610030575b600080fd5b61003861003a565b005b6100786040518060400160405280600581526020017f68656c6c6f00000000000000000000000000000000000000000000000000000081525061007a565b565b6101108160405160240161008e91906101f3565b6040516020818303038152906040527f41304fac000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19166020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff8381831617835250505050610113565b50565b61012a8161012261012d61014e565b63ffffffff16565b50565b60006a636f6e736f6c652e6c6f679050600080835160208501845afa505050565b610159819050919050565b610161610215565b565b600081519050919050565b600082825260208201905092915050565b60005b8381101561019d578082015181840152602081019050610182565b60008484015250505050565b6000601f19601f8301169050919050565b60006101c582610163565b6101cf818561016e565b93506101df81856020860161017f565b6101e8816101a9565b840191505092915050565b6000602082019050818103600083015261020d81846101ba565b905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052605160045260246000fdfea26469706673582212201e965281cb15cf946ada70867e2acb07debad82404e574500944a7b3e0b799ac64736f6c63430008110033")?;

        let deploy_tx = TransactionRequest::Eip1559(Eip1559TransactionRequest {
            kind: TransactionKind::Create,
            gas_limit: 10_000_000,
            value: U256::ZERO,
            input: byte_code.into(),
            nonce: 0,
            max_priority_fee_per_gas: U256::from(42_000_000_000_u64),
            chain_id: provider_data.chain_id(),
            max_fee_per_gas: U256::from(42_000_000_000_u64),
            access_list: vec![],
        });

        let sender = *provider_data
            .accounts()
            .next()
            .context("should have accounts")?;

        let signed_transaction =
            provider_data.sign_transaction_request(TransactionRequestAndSender {
                request: deploy_tx,
                sender,
            })?;

        let deploy_tx_hash = provider_data
            .send_transaction(signed_transaction)?
            .transaction_hash;

        let deploy_receipt = provider_data
            .transaction_receipt(&deploy_tx_hash)?
            .context("deploy receipt should exist")?;
        let contract_address = deploy_receipt
            .contract_address
            .context("contract address should exist")?;

        // Call f()
        let call_data = hex::decode("26121ff0")?;

        // Expected call data for `console.log("hello")`
        let expected_call_data = hex::decode("41304fac0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000568656c6c6f000000000000000000000000000000000000000000000000000000")?.into();

        let transaction_request = TransactionRequest::Eip1559(Eip1559TransactionRequest {
            kind: TransactionKind::Call(contract_address),
            gas_limit: 10_000_000,
            value: U256::ZERO,
            input: call_data.into(),
            nonce: 1,
            max_priority_fee_per_gas: U256::from(42_000_000_000_u64),
            chain_id: provider_data.chain_id(),
            max_fee_per_gas: U256::from(42_000_000_000_u64),
            access_list: vec![],
        });

        Ok(ConsoleLogTransaction {
            transaction: TransactionRequestAndSender {
                request: transaction_request,
                sender,
            },
            expected_call_data,
        })
    }
}
