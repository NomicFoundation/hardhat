use std::process::{Child, Command, Stdio};

use assert_cmd::{
    assert::Assert,
    cargo::CommandCargoExt, // for process::Command::cargo_bin
};
use predicates::str::contains;

use rethnet_eth::{
    remote::{
        client::Request as RpcRequest, jsonrpc, methods::MethodInvocation as EthMethodInvocation,
        BlockSpec,
    },
    Address, Bytes, U256,
};
use rethnet_rpc_server::{HardhatMethodInvocation, MethodInvocation, TEST_ACCOUNTS};

fn shutdown(child: &mut Child) -> Result<(), std::io::Error> {
    #[cfg(unix)]
    let result = {
        use signal_child::Signalable;
        child.interrupt()
    };

    #[cfg(windows)]
    let result = {
        use winsafe::{co::PROCESS, prelude::kernel_Hprocess, HPROCESS};

        let process_id = child.id();
        HPROCESS::OpenProcess(PROCESS::TERMINATE, false, process_id)
            .map_err(|e| {
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("OpenProcess(TERMINATE, {process_id}) failed: {e}"),
                )
            })?
            .TerminateProcess(0)
            .map_err(|e| {
                std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("TerminateProcess() failed: {e}"),
                )
            })
    };

    #[cfg(all(not(windows), not(unix)))]
    panic!(
        "child process is STILL RUNNING (pid={}) because we don't know this OS so we don't know how to signal it to shut down",
        child.id(),
    );

    result
}

#[tokio::test]
async fn node() -> Result<(), Box<dyn std::error::Error>> {
    use std::str::FromStr;
    let address = Address::from_str(TEST_ACCOUNTS[0])?;

    // the order of operations is a little weird in this test, because we spawn a separate process
    // for the server, and we want to make sure that we end that process gracefully. more
    // specifically, once the server is started, we avoid the ? operator until the server has been
    // stopped.

    // hold method invocations separately from requests so that we can easily iterate over them in
    // order to check for corresponding log entries in the server output:
    let method_invocations = [
        MethodInvocation::Eth(EthMethodInvocation::GetBalance(
            address,
            BlockSpec::latest(),
        )),
        MethodInvocation::Eth(EthMethodInvocation::GetCode(address, BlockSpec::latest())),
        MethodInvocation::Eth(EthMethodInvocation::GetStorageAt(
            address,
            U256::ZERO,
            BlockSpec::latest(),
        )),
        MethodInvocation::Eth(EthMethodInvocation::GetTransactionCount(
            address,
            BlockSpec::latest(),
        )),
        MethodInvocation::Hardhat(HardhatMethodInvocation::SetBalance(address, U256::ZERO)),
        MethodInvocation::Hardhat(HardhatMethodInvocation::SetCode(
            address,
            Bytes::from_static("deadbeef".as_bytes()).into(),
        )),
        MethodInvocation::Hardhat(HardhatMethodInvocation::SetNonce(address, U256::ZERO)),
        MethodInvocation::Hardhat(HardhatMethodInvocation::SetStorageAt(
            address,
            U256::ZERO,
            U256::ZERO,
        )),
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
        .stdout(Stdio::piped())
        .spawn()?;

    // (required for CI runs on MacOS) sleep a moment to make sure the server comes up before we
    // start sending requests:
    std::thread::sleep(std::time::Duration::from_secs(1));

    // query the server, but don't check the Result yet, because returning early would prevent us
    // from gracefully terminating the server:
    let send_result = reqwest::Client::new()
        .post("http://127.0.0.1:8545/")
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .body(request_body)
        .send()
        .await;

    // signal the server to shut down gracefully:
    shutdown(&mut server)?;

    // wait for server to terminate:
    let output = server.wait_with_output()?;

    // validate query Result:
    send_result?.text().await?;

    // assert that the standard output of the server process contains the expected log entries:
    Assert::new(output.clone()).stdout(contains("Listening on 127.0.0.1:8545"));
    for method_invocation in method_invocations {
        Assert::new(output.clone()).stdout(contains(match method_invocation {
            MethodInvocation::Eth(EthMethodInvocation::GetBalance(address, block_spec)) => {
                format!("eth_getBalance({address:?}, {block_spec:?})")
            }
            MethodInvocation::Eth(EthMethodInvocation::GetCode(address, block_spec)) => {
                format!("eth_getCode({address:?}, {block_spec:?})")
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
            _ => Err(format!(
                "no expectation set for method invocation {method_invocation:?}"
            ))?,
        }));
    }

    Ok(())
}
