use std::process::{Command, Stdio};

use assert_cmd::{
    assert::Assert,
    cargo::CommandCargoExt, // for process::Command::cargo_bin
};
use predicates::str::contains;
use secp256k1::Secp256k1;

use rethnet::config::DEFAULT_PRIVATE_KEYS;
use rethnet_eth::{
    remote::{
        client::Request as RpcRequest,
        jsonrpc,
        methods::{MethodInvocation as EthMethodInvocation, U256OrUsize},
        BlockSpec,
    },
    signature::private_key_to_address,
    Bytes, U256,
};
use rethnet_rpc_server::{HardhatMethodInvocation, MethodInvocation};

#[tokio::test]
async fn node() -> Result<(), Box<dyn std::error::Error>> {
    let address =
        private_key_to_address(&Secp256k1::signing_only(), DEFAULT_PRIVATE_KEYS[0]).unwrap();

    // the order of operations is a little weird in this test, because we spawn a separate process
    // for the server, and we want to make sure that we end that process gracefully. more
    // specifically, once the server is started, we avoid the ? operator until the server has been
    // stopped.

    // hold method invocations separately from requests so that we can easily iterate over them in
    // order to check for corresponding log entries in the server output:
    let method_invocations = [
        MethodInvocation::Eth(EthMethodInvocation::Accounts()),
        MethodInvocation::Eth(EthMethodInvocation::BlockNumber()),
        MethodInvocation::Eth(EthMethodInvocation::ChainId()),
        MethodInvocation::Eth(EthMethodInvocation::Coinbase()),
        MethodInvocation::Eth(EthMethodInvocation::EvmIncreaseTime(U256OrUsize::U256(
            U256::from(12345),
        ))),
        MethodInvocation::Eth(EthMethodInvocation::EvmMine(Some(U256OrUsize::U256(
            U256::from(12345),
        )))),
        MethodInvocation::Eth(EthMethodInvocation::EvmSetNextBlockTimestamp(
            U256OrUsize::U256(U256::from(12345)),
        )),
        MethodInvocation::Eth(EthMethodInvocation::GetBalance(
            address,
            Some(BlockSpec::latest()),
        )),
        MethodInvocation::Eth(EthMethodInvocation::GetCode(
            address,
            Some(BlockSpec::latest()),
        )),
        MethodInvocation::Eth(EthMethodInvocation::GetFilterChanges(U256::from(1))),
        MethodInvocation::Eth(EthMethodInvocation::GetFilterLogs(U256::from(1))),
        MethodInvocation::Eth(EthMethodInvocation::GetStorageAt(
            address,
            U256::ZERO,
            Some(BlockSpec::latest()),
        )),
        MethodInvocation::Eth(EthMethodInvocation::GetTransactionCount(
            address,
            Some(BlockSpec::latest()),
        )),
        MethodInvocation::Eth(EthMethodInvocation::NetListening()),
        MethodInvocation::Eth(EthMethodInvocation::NetPeerCount()),
        MethodInvocation::Eth(EthMethodInvocation::NetVersion()),
        MethodInvocation::Eth(EthMethodInvocation::NewPendingTransactionFilter()),
        MethodInvocation::Eth(EthMethodInvocation::UninstallFilter(U256::from(1))),
        MethodInvocation::Eth(EthMethodInvocation::Unsubscribe(U256::from(1))),
        MethodInvocation::Eth(EthMethodInvocation::Unsubscribe(U256::from(1))),
        MethodInvocation::Eth(EthMethodInvocation::Sign(
            address,
            bytes::Bytes::from(hex::decode("deadbeef").unwrap()).into(),
        )),
        MethodInvocation::Eth(EthMethodInvocation::Web3ClientVersion()),
        MethodInvocation::Eth(EthMethodInvocation::Web3Sha3(
            Bytes::from_static(b"").into(),
        )),
        MethodInvocation::Hardhat(HardhatMethodInvocation::ImpersonateAccount(address)),
        MethodInvocation::Hardhat(HardhatMethodInvocation::SetBalance(address, U256::ZERO)),
        MethodInvocation::Hardhat(HardhatMethodInvocation::SetCode(
            address,
            Bytes::from_static(b"deadbeef").into(),
        )),
        MethodInvocation::Hardhat(HardhatMethodInvocation::SetNonce(address, U256::ZERO)),
        MethodInvocation::Hardhat(HardhatMethodInvocation::SetStorageAt(
            address,
            U256::ZERO,
            U256::ZERO,
        )),
        MethodInvocation::Hardhat(HardhatMethodInvocation::StopImpersonatingAccount(address)),
    ];

    // prepare request body before even spawning the server because serialization could fail:
    let request_body: String = serde_json::to_string(
        &method_invocations
            .iter()
            .enumerate()
            .map(|(id, method)| RpcRequest {
                version: jsonrpc::Version::V2_0,
                id: jsonrpc::Id::Num(id.try_into().unwrap()),
                method: method.clone(),
            })
            .collect::<Vec<RpcRequest<MethodInvocation>>>(),
    )?;

    // spawn the server process:
    let mut server = Command::cargo_bin("rethnet")?
        .arg("node")
        .arg("--port")
        .arg("8549")
        .arg("-vv")
        .arg("--coinbase")
        .arg("0xffffffffffffffffffffffffffffffffffffffff")
        .arg("--chain-id")
        .arg("1")
        .arg("--network-id")
        .arg("1")
        .stdout(Stdio::piped())
        .spawn()?;

    // (required for CI runs on MacOS) sleep a moment to make sure the server comes up before we
    // start sending requests:
    std::thread::sleep(std::time::Duration::from_secs(1));

    // query the server, but don't check the Result yet, because returning early would prevent us
    // from gracefully terminating the server:
    let send_result = reqwest::Client::new()
        .post("http://127.0.0.1:8549/")
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .body(request_body)
        .send()
        .await;

    // signal the server to shut down gracefully:
    server.kill()?;

    // wait for server to terminate:
    let output = server.wait_with_output()?;

    // validate query Result:
    send_result?.text().await?;

    // assert that the standard output of the server process contains the expected log entries:
    Assert::new(output.clone()).stdout(contains("Listening on 127.0.0.1:8549"));
    let context = Secp256k1::signing_only();
    for (i, default_private_key) in DEFAULT_PRIVATE_KEYS.to_vec().iter().enumerate() {
        Assert::new(output.clone())
            .stdout(contains(format!("Private Key: 0x{default_private_key}")))
            .stdout(contains(format!(
                "Account #{}: {:?}",
                i + 1,
                private_key_to_address(&context, default_private_key).unwrap()
            )));
    }
    for method_invocation in method_invocations {
        Assert::new(output.clone()).stdout(contains(match method_invocation {
            MethodInvocation::Eth(EthMethodInvocation::Accounts()) => {
                String::from("eth_accounts()")
            }
            MethodInvocation::Eth(EthMethodInvocation::BlockNumber()) => {
                String::from("eth_blockNumber()")
            }
            MethodInvocation::Eth(EthMethodInvocation::ChainId()) => String::from("eth_chainId()"),
            MethodInvocation::Eth(EthMethodInvocation::Coinbase()) => {
                String::from("eth_coinbase()")
            }
            MethodInvocation::Eth(EthMethodInvocation::EvmIncreaseTime(increment)) => {
                format!("evm_increaseTime({increment:?})")
            }
            MethodInvocation::Eth(EthMethodInvocation::EvmMine(timestamp)) => {
                format!("evm_mine({timestamp:?})")
            }
            MethodInvocation::Eth(EthMethodInvocation::EvmSetNextBlockTimestamp(timestamp)) => {
                format!("evm_setNextBlockTimestamp({timestamp:?})")
            }
            MethodInvocation::Eth(EthMethodInvocation::GetBalance(address, block_spec)) => {
                format!("eth_getBalance({address:?}, {block_spec:?})")
            }
            MethodInvocation::Eth(EthMethodInvocation::GetCode(address, block_spec)) => {
                format!("eth_getCode({address:?}, {block_spec:?})")
            }
            MethodInvocation::Eth(EthMethodInvocation::GetFilterChanges(filter_id)) => {
                format!("eth_getFilterChanges({filter_id:?})")
            }
            MethodInvocation::Eth(EthMethodInvocation::GetFilterLogs(filter_id)) => {
                format!("eth_getFilterLogs({filter_id:?})")
            }
            MethodInvocation::Eth(EthMethodInvocation::GetStorageAt(
                address,
                position,
                block_spec,
            )) => format!("eth_getStorageAt({address:?}, {position:?}, {block_spec:?})"),
            MethodInvocation::Eth(EthMethodInvocation::GetTransactionCount(
                address,
                block_spec,
            )) => format!("eth_getTransactionCount({address:?}, {block_spec:?})"),
            MethodInvocation::Eth(EthMethodInvocation::NetListening()) => {
                String::from("net_listening()")
            }
            MethodInvocation::Eth(EthMethodInvocation::NetPeerCount()) => {
                String::from("net_peerCount()")
            }
            MethodInvocation::Eth(EthMethodInvocation::NetVersion()) => {
                String::from("net_version()")
            }
            MethodInvocation::Eth(EthMethodInvocation::NewPendingTransactionFilter()) => {
                String::from("eth_newPendingTransactionFilter()")
            }
            MethodInvocation::Eth(EthMethodInvocation::UninstallFilter(filter_id)) => {
                format!("eth_uninstallFilter({filter_id:?})")
            }
            MethodInvocation::Eth(EthMethodInvocation::Unsubscribe(filter_id)) => {
                format!("eth_unsubscribe({filter_id:?})")
            }
            MethodInvocation::Eth(EthMethodInvocation::Sign(address, message)) => {
                format!("eth_sign({address:?}, {message:?})")
            }
            MethodInvocation::Eth(EthMethodInvocation::Web3ClientVersion()) => {
                String::from("web3_clientVersion()")
            }
            MethodInvocation::Eth(EthMethodInvocation::Web3Sha3(message)) => {
                format!("web3_sha3({message:?})")
            }
            MethodInvocation::Hardhat(HardhatMethodInvocation::ImpersonateAccount(address)) => {
                format!("hardhat_impersonateAccount({address:?}")
            }
            MethodInvocation::Hardhat(HardhatMethodInvocation::SetBalance(address, balance)) => {
                format!("hardhat_setBalance({address:?}, {balance:?}")
            }
            MethodInvocation::Hardhat(HardhatMethodInvocation::SetCode(address, code)) => {
                format!("hardhat_setCode({address:?}, {code:?}")
            }
            MethodInvocation::Hardhat(HardhatMethodInvocation::SetNonce(address, nonce)) => {
                format!("hardhat_setNonce({address:?}, {nonce:?}")
            }
            MethodInvocation::Hardhat(HardhatMethodInvocation::SetStorageAt(
                address,
                position,
                value,
            )) => format!("hardhat_setStorageAt({address:?}, {position:?}, {value:?}"),
            MethodInvocation::Hardhat(HardhatMethodInvocation::StopImpersonatingAccount(
                address,
            )) => {
                format!("hardhat_stopImpersonatingAccount({address:?}")
            }
            _ => Err(format!(
                "no expectation set for method invocation {method_invocation:?}"
            ))?,
        }));
    }

    Ok(())
}
