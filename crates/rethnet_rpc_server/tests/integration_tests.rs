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

#[tokio::test]
async fn test_get_balance_nonexistent_account() {
    let request = RpcRequest {
        version: jsonrpc::Version::V2_0,
        id: jsonrpc::Id::Num(0),
        method: MethodInvocation::Eth(EthMethodInvocation::GetBalance(
            Address::from_low_u64_ne(2),
            BlockSpec::latest(),
        )),
    };

    let expected_response = jsonrpc::Response::<U256> {
        jsonrpc: request.version,
        id: request.id.clone(),
        data: jsonrpc::ResponseData::Error {
            error: jsonrpc::Error {
                code: 0,
                message: String::from("No such account"),
                data: None,
            },
        },
    };

    let actual_response: jsonrpc::Response<U256> =
        serde_json::from_str(&submit_request(&start_server().await, &request).await)
            .expect("should deserialize from JSON");

    assert_eq!(actual_response, expected_response);
}

#[tokio::test]
async fn test_get_balance_success() {
    let request = RpcRequest {
        version: jsonrpc::Version::V2_0,
        id: jsonrpc::Id::Num(0),
        method: MethodInvocation::Eth(EthMethodInvocation::GetBalance(
            Address::from_low_u64_ne(1),
            BlockSpec::latest(),
        )),
    };

    let expected_response = jsonrpc::Response::<U256> {
        jsonrpc: request.version,
        id: request.id.clone(),
        data: jsonrpc::ResponseData::Success { result: U256::ZERO },
    };

    let actual_response: jsonrpc::Response<U256> =
        serde_json::from_str(&submit_request(&start_server().await, &request).await)
            .expect("should deserialize from JSON");

    assert_eq!(actual_response, expected_response);
}

#[tokio::test]
async fn test_get_code_success() {
    let request = RpcRequest {
        version: jsonrpc::Version::V2_0,
        id: jsonrpc::Id::Num(0),
        method: MethodInvocation::Eth(EthMethodInvocation::GetCode(
            Address::from_low_u64_ne(1),
            BlockSpec::latest(),
        )),
    };

    let expected_response = jsonrpc::Response::<ZeroXPrefixedBytes> {
        jsonrpc: request.version,
        id: request.id.clone(),
        data: jsonrpc::ResponseData::Success {
            result: ZeroXPrefixedBytes::from(Bytes::from_static(b"\0")),
        },
    };

    let actual_response: jsonrpc::Response<ZeroXPrefixedBytes> =
        serde_json::from_str(&submit_request(&start_server().await, &request).await)
            .expect("should deserialize from JSON");

    assert_eq!(actual_response, expected_response);
}

#[tokio::test]
async fn test_get_storage_success() {
    let request = RpcRequest {
        version: jsonrpc::Version::V2_0,
        id: jsonrpc::Id::Num(0),
        method: MethodInvocation::Eth(EthMethodInvocation::GetStorageAt(
            Address::from_low_u64_ne(1),
            U256::ZERO,
            BlockSpec::latest(),
        )),
    };

    let expected_response = jsonrpc::Response::<U256> {
        jsonrpc: request.version,
        id: request.id.clone(),
        data: jsonrpc::ResponseData::Success { result: U256::ZERO },
    };

    let actual_response: jsonrpc::Response<U256> =
        serde_json::from_str(&submit_request(&start_server().await, &request).await)
            .expect("should deserialize from JSON");

    assert_eq!(actual_response, expected_response);
}

#[tokio::test]
async fn test_get_transaction_count_nonexistent_account() {
    let request = RpcRequest {
        version: jsonrpc::Version::V2_0,
        id: jsonrpc::Id::Num(0),
        method: MethodInvocation::Eth(EthMethodInvocation::GetTransactionCount(
            Address::from_low_u64_ne(2),
            BlockSpec::latest(),
        )),
    };

    let expected_response = jsonrpc::Response::<U256> {
        jsonrpc: request.version,
        id: request.id.clone(),
        data: jsonrpc::ResponseData::Error {
            error: jsonrpc::Error {
                code: 0,
                message: String::from("No such account"),
                data: None,
            },
        },
    };

    let actual_response: jsonrpc::Response<U256> =
        serde_json::from_str(&submit_request(&start_server().await, &request).await)
            .expect("should deserialize from JSON");

    assert_eq!(actual_response, expected_response);
}

#[tokio::test]
async fn test_get_transaction_count_success() {
    let request = RpcRequest {
        version: jsonrpc::Version::V2_0,
        id: jsonrpc::Id::Num(0),
        method: MethodInvocation::Eth(EthMethodInvocation::GetTransactionCount(
            Address::from_low_u64_ne(1),
            BlockSpec::latest(),
        )),
    };

    let expected_response = jsonrpc::Response::<U256> {
        jsonrpc: request.version,
        id: request.id.clone(),
        data: jsonrpc::ResponseData::Success { result: U256::ZERO },
    };

    let actual_response: jsonrpc::Response<U256> =
        serde_json::from_str(&submit_request(&start_server().await, &request).await)
            .expect("should deserialize from JSON");

    assert_eq!(actual_response, expected_response);
}

#[tokio::test]
async fn test_set_balance_success() {
    let server_address = start_server().await;

    let address = Address::from_low_u64_ne(1);
    let new_balance = U256::from(100);

    let request = RpcRequest {
        version: jsonrpc::Version::V2_0,
        id: jsonrpc::Id::Num(0),
        method: MethodInvocation::Hardhat(HardhatMethodInvocation::SetBalance(
            address,
            new_balance,
        )),
    };

    let expected_response = jsonrpc::Response::<()> {
        jsonrpc: request.version,
        id: request.id.clone(),
        data: jsonrpc::ResponseData::Success { result: () },
    };

    let actual_response: jsonrpc::Response<()> =
        serde_json::from_str(&submit_request(&server_address, &request).await)
            .expect("should deserialize from JSON");

    assert_eq!(actual_response, expected_response);

    let request = RpcRequest {
        version: jsonrpc::Version::V2_0,
        id: jsonrpc::Id::Num(0),
        method: MethodInvocation::Eth(EthMethodInvocation::GetBalance(
            address,
            BlockSpec::latest(),
        )),
    };

    let expected_response = jsonrpc::Response::<U256> {
        jsonrpc: request.version,
        id: request.id.clone(),
        data: jsonrpc::ResponseData::Success {
            result: new_balance,
        },
    };

    let actual_response: jsonrpc::Response<U256> =
        serde_json::from_str(&submit_request(&server_address, &request).await)
            .expect("should deserialize from JSON");

    assert_eq!(actual_response, expected_response);
}

#[tokio::test]
async fn test_set_nonce_success() {
    let server_address = start_server().await;

    let address = Address::from_low_u64_ne(1);
    let new_nonce = U256::from(100);

    let request = RpcRequest {
        version: jsonrpc::Version::V2_0,
        id: jsonrpc::Id::Num(0),
        method: MethodInvocation::Hardhat(HardhatMethodInvocation::SetNonce(address, new_nonce)),
    };

    let expected_response = jsonrpc::Response::<()> {
        jsonrpc: request.version,
        id: request.id.clone(),
        data: jsonrpc::ResponseData::Success { result: () },
    };

    let actual_response: jsonrpc::Response<()> =
        serde_json::from_str(&submit_request(&server_address, &request).await)
            .expect("should deserialize from JSON");

    assert_eq!(actual_response, expected_response);

    let request = RpcRequest {
        version: jsonrpc::Version::V2_0,
        id: jsonrpc::Id::Num(0),
        method: MethodInvocation::Eth(EthMethodInvocation::GetTransactionCount(
            address,
            BlockSpec::latest(),
        )),
    };

    let expected_response = jsonrpc::Response::<U256> {
        jsonrpc: request.version,
        id: request.id.clone(),
        data: jsonrpc::ResponseData::Success { result: new_nonce },
    };

    let actual_response: jsonrpc::Response<U256> =
        serde_json::from_str(&submit_request(&server_address, &request).await)
            .expect("should deserialize from JSON");

    assert_eq!(actual_response, expected_response);
}

#[tokio::test]
async fn test_set_code_success() {
    let server_address = start_server().await;

    let address = Address::from_low_u64_ne(1);
    let new_code = ZeroXPrefixedBytes::from(Bytes::from_static(b"deadbeef"));

    let request = RpcRequest {
        version: jsonrpc::Version::V2_0,
        id: jsonrpc::Id::Num(0),
        method: MethodInvocation::Hardhat(HardhatMethodInvocation::SetCode(
            address,
            new_code.clone(),
        )),
    };

    let expected_response = jsonrpc::Response::<()> {
        jsonrpc: request.version,
        id: request.id.clone(),
        data: jsonrpc::ResponseData::Success { result: () },
    };

    let actual_response: jsonrpc::Response<()> =
        serde_json::from_str(&submit_request(&server_address, &request).await)
            .expect("should deserialize from JSON");

    assert_eq!(actual_response, expected_response);

    let request = RpcRequest {
        version: jsonrpc::Version::V2_0,
        id: jsonrpc::Id::Num(0),
        method: MethodInvocation::Eth(EthMethodInvocation::GetCode(address, BlockSpec::latest())),
    };

    let expected_response = jsonrpc::Response::<ZeroXPrefixedBytes> {
        jsonrpc: request.version,
        id: request.id.clone(),
        data: jsonrpc::ResponseData::Success {
            result: new_code.clone(),
        },
    };

    let actual_response: jsonrpc::Response<ZeroXPrefixedBytes> =
        serde_json::from_str(&submit_request(&server_address, &request).await)
            .expect("should deserialize from JSON");

    assert_eq!(actual_response, expected_response);
}

#[tokio::test]
async fn test_set_storage_at_success() {
    let server_address = start_server().await;

    let address = Address::from_low_u64_ne(1);
    let new_storage_value = U256::from(100);

    let request = RpcRequest {
        version: jsonrpc::Version::V2_0,
        id: jsonrpc::Id::Num(0),
        method: MethodInvocation::Hardhat(HardhatMethodInvocation::SetStorageAt(
            address,
            U256::ZERO,
            new_storage_value,
        )),
    };

    let expected_response = jsonrpc::Response::<()> {
        jsonrpc: request.version,
        id: request.id.clone(),
        data: jsonrpc::ResponseData::Success { result: () },
    };

    let actual_response: jsonrpc::Response<()> =
        serde_json::from_str(&submit_request(&server_address, &request).await)
            .expect("should deserialize from JSON");

    assert_eq!(actual_response, expected_response);

    let request = RpcRequest {
        version: jsonrpc::Version::V2_0,
        id: jsonrpc::Id::Num(0),
        method: MethodInvocation::Eth(EthMethodInvocation::GetStorageAt(
            address,
            U256::ZERO,
            BlockSpec::latest(),
        )),
    };

    let expected_response = jsonrpc::Response::<U256> {
        jsonrpc: request.version,
        id: request.id.clone(),
        data: jsonrpc::ResponseData::Success {
            result: new_storage_value,
        },
    };

    let actual_response: jsonrpc::Response<U256> =
        serde_json::from_str(&submit_request(&server_address, &request).await)
            .expect("should deserialize from JSON");

    assert_eq!(actual_response, expected_response);
}
