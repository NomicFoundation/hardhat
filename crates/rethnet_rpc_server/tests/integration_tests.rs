use std::net::SocketAddr;

use hashbrown::HashMap;
use rethnet_eth::remote::ZeroXPrefixedBytes;
use tracing::Level;

use rethnet_eth::{
    remote::{
        client::Request as RpcRequest, jsonrpc, methods::MethodInvocation as EthMethodInvocation,
        BlockSpec,
    },
    Address, Bytes, U256,
};
use rethnet_evm::{AccountInfo, KECCAK_EMPTY};

use rethnet_rpc_server::{
    Config, HardhatMethodInvocation, MethodInvocation, RpcHardhatNetworkConfig, Server,
};

async fn start_server() -> SocketAddr {
    let mut accounts: HashMap<Address, AccountInfo> = Default::default();
    accounts.insert(
        Address::from_low_u64_ne(1),
        AccountInfo {
            code: None,
            code_hash: KECCAK_EMPTY,
            balance: U256::ZERO,
            nonce: 0,
        },
    );

    let server = Server::new(
        Config {
            address: "127.0.0.1:0".parse::<SocketAddr>().unwrap(),
            rpc_hardhat_network_config: RpcHardhatNetworkConfig { forking: None },
        },
        accounts,
    )
    .await
    .unwrap();

    let address = server.local_addr();
    tokio::spawn(async move { server.serve().await.unwrap() });
    address
}

async fn submit_request(address: &SocketAddr, request: &RpcRequest<MethodInvocation>) -> String {
    tracing_subscriber::fmt::Subscriber::builder()
        .with_max_level(Level::INFO)
        .try_init()
        .ok();
    let url = format!("http://{address}/");
    let body = serde_json::to_string(&request).expect("should serialize request to JSON");
    reqwest::Client::new()
        .post(&url)
        .header(reqwest::header::CONTENT_TYPE, "application/json")
        .body(body.clone())
        .send()
        .await
        .unwrap_or_else(|_| panic!("should send to url '{url}' request body '{body}'"))
        .text()
        .await
        .unwrap_or_else(|_| panic!("should get full response text"))
}

async fn verify_response<ResponseT>(
    server: &SocketAddr,
    method: MethodInvocation,
    response_data: jsonrpc::ResponseData<ResponseT>,
) where
    ResponseT: serde::de::DeserializeOwned + std::fmt::Debug + std::cmp::PartialEq,
{
    let request = RpcRequest {
        version: jsonrpc::Version::V2_0,
        id: jsonrpc::Id::Num(0),
        method,
    };

    let expected_response = jsonrpc::Response::<ResponseT> {
        jsonrpc: request.version,
        id: request.id.clone(),
        data: response_data,
    };

    let unparsed_response = submit_request(server, &request).await;

    let actual_response: jsonrpc::Response<ResponseT> =
        serde_json::from_str(&unparsed_response).expect("should deserialize from JSON");

    assert_eq!(actual_response, expected_response);
}

#[tokio::test]
async fn test_accounts() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::Accounts()),
        jsonrpc::ResponseData::Success {
            result: vec![Address::from_low_u64_ne(1)],
        },
    )
    .await;
}

#[tokio::test]
async fn test_get_balance_nonexistent_account() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::GetBalance(
            Address::from_low_u64_ne(2),
            Some(BlockSpec::latest()),
        )),
        jsonrpc::ResponseData::Success { result: U256::ZERO },
    )
    .await;
}

#[tokio::test]
async fn test_get_balance_success() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::GetBalance(
            Address::from_low_u64_ne(1),
            Some(BlockSpec::latest()),
        )),
        jsonrpc::ResponseData::Success { result: U256::ZERO },
    )
    .await;
}

#[tokio::test]
async fn test_get_code_success() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::GetCode(
            Address::from_low_u64_ne(1),
            Some(BlockSpec::latest()),
        )),
        jsonrpc::ResponseData::Success {
            result: ZeroXPrefixedBytes::from(Bytes::from_static(b"\0")),
        },
    )
    .await;
}

#[tokio::test]
async fn test_get_storage_success() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::GetStorageAt(
            Address::from_low_u64_ne(1),
            U256::ZERO,
            Some(BlockSpec::latest()),
        )),
        jsonrpc::ResponseData::Success { result: U256::ZERO },
    )
    .await;
}

#[tokio::test]
async fn test_get_transaction_count_nonexistent_account() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::GetTransactionCount(
            Address::from_low_u64_ne(2),
            Some(BlockSpec::latest()),
        )),
        jsonrpc::ResponseData::Success { result: U256::ZERO },
    )
    .await;
}

#[tokio::test]
async fn test_get_transaction_count_success() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::GetTransactionCount(
            Address::from_low_u64_ne(1),
            Some(BlockSpec::latest()),
        )),
        jsonrpc::ResponseData::Success { result: U256::ZERO },
    )
    .await;
}

#[tokio::test]
async fn test_set_balance_success() {
    let server_address = start_server().await;

    let address = Address::from_low_u64_ne(1);
    let new_balance = U256::from(100);

    verify_response(
        &server_address,
        MethodInvocation::Hardhat(HardhatMethodInvocation::SetBalance(address, new_balance)),
        jsonrpc::ResponseData::Success { result: () },
    )
    .await;

    verify_response(
        &server_address,
        MethodInvocation::Eth(EthMethodInvocation::GetBalance(
            address,
            Some(BlockSpec::latest()),
        )),
        jsonrpc::ResponseData::Success {
            result: new_balance,
        },
    )
    .await;
}

#[tokio::test]
async fn test_set_nonce_success() {
    let server_address = start_server().await;

    let address = Address::from_low_u64_ne(1);
    let new_nonce = U256::from(100);

    verify_response(
        &server_address,
        MethodInvocation::Hardhat(HardhatMethodInvocation::SetNonce(address, new_nonce)),
        jsonrpc::ResponseData::Success { result: () },
    )
    .await;

    verify_response(
        &server_address,
        MethodInvocation::Eth(EthMethodInvocation::GetTransactionCount(
            address,
            Some(BlockSpec::latest()),
        )),
        jsonrpc::ResponseData::Success { result: new_nonce },
    )
    .await;
}

#[tokio::test]
async fn test_set_code_success() {
    let server_address = start_server().await;

    let address = Address::from_low_u64_ne(1);
    let new_code = ZeroXPrefixedBytes::from(Bytes::from_static(b"deadbeef"));

    verify_response(
        &server_address,
        MethodInvocation::Hardhat(HardhatMethodInvocation::SetCode(address, new_code.clone())),
        jsonrpc::ResponseData::Success { result: () },
    )
    .await;

    verify_response(
        &server_address,
        MethodInvocation::Eth(EthMethodInvocation::GetCode(
            address,
            Some(BlockSpec::latest()),
        )),
        jsonrpc::ResponseData::Success {
            result: new_code.clone(),
        },
    )
    .await;
}

#[tokio::test]
async fn test_set_storage_at_success() {
    let server_address = start_server().await;

    let address = Address::from_low_u64_ne(1);
    let new_storage_value = U256::from(100);

    verify_response(
        &server_address,
        MethodInvocation::Hardhat(HardhatMethodInvocation::SetStorageAt(
            address,
            U256::ZERO,
            new_storage_value,
        )),
        jsonrpc::ResponseData::Success { result: () },
    )
    .await;

    verify_response(
        &server_address,
        MethodInvocation::Eth(EthMethodInvocation::GetStorageAt(
            address,
            U256::ZERO,
            Some(BlockSpec::latest()),
        )),
        jsonrpc::ResponseData::Success {
            result: new_storage_value,
        },
    )
    .await;
}
