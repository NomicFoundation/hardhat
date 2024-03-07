use std::sync::Arc;

use edr_eth::{Address, Bytes};
use edr_evm::{
    address,
    db::Database,
    evm::{EvmHandler, FrameOrResult},
    EVMError, GetContextData,
};

const CONSOLE_ADDRESS: Address = address!("000000000000000000636F6e736F6c652e6c6f67");

/// Registers the `ConsoleLogCollector`'s handles.
pub fn register_console_log_handles<
    DatabaseT: Database,
    ContextT: GetContextData<ConsoleLogCollector>,
>(
    handler: &mut EvmHandler<'_, ContextT, DatabaseT>,
) {
    let old_handle = handler.execution.call.clone();
    handler.execution.call = Arc::new(
        move |ctx, inputs| -> Result<FrameOrResult, EVMError<DatabaseT::Error>> {
            if inputs.contract == CONSOLE_ADDRESS {
                let collector = ctx.external.get_context_data();
                collector.record_console_log(inputs.input.clone());
            }

            old_handle(ctx, inputs)
        },
    );
}

#[derive(Default)]
pub struct ConsoleLogCollector {
    encoded_messages: Vec<Bytes>,
}

impl ConsoleLogCollector {
    /// Returns the collected `console.log` messages.
    pub fn into_encoded_messages(self) -> Vec<Bytes> {
        self.encoded_messages
    }

    fn record_console_log(&mut self, encoded_message: Bytes) {
        self.encoded_messages.push(encoded_message);
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
