use std::{
    net::{IpAddr, Ipv4Addr, SocketAddr},
    str::FromStr,
    time::SystemTime,
};

use secp256k1::{Secp256k1, SecretKey};
use tempfile::TempDir;
use tracing::Level;

use rethnet_eth::{
    remote::{
        client::Request as RpcRequest,
        filter::FilteredEvents,
        jsonrpc,
        methods::{MethodInvocation as EthMethodInvocation, U256OrUsize},
        BlockSpec,
    },
    serde::ZeroXPrefixedBytes,
    signature::{private_key_to_address, Signature},
    Address, Bytes, SpecId, B256, U256, U64,
};
use rethnet_evm::{AccountInfo, HashMap, KECCAK_EMPTY};

use rethnet_rpc_server::{
    AccountConfig, Config, HardhatMethodInvocation, MethodInvocation, RpcHardhatNetworkConfig,
    Server,
};

const PRIVATE_KEY: &str = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

struct TestFixture {
    server_address: SocketAddr,
    // We need to keep the tempdir alive for the duration of the test
    _cache_dir: TempDir,
}

async fn start_server() -> TestFixture {
    let mut accounts: HashMap<Address, AccountInfo> = HashMap::default();
    accounts.insert(
        Address::from_low_u64_ne(1),
        AccountInfo {
            code: None,
            code_hash: KECCAK_EMPTY,
            balance: U256::ZERO,
            nonce: 0,
        },
    );

    let cache_dir = TempDir::new().expect("should create temp dir");

    let server = Server::new(Config {
        address: SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 0),
        allow_blocks_with_same_timestamp: false,
        allow_unlimited_contract_size: false,
        rpc_hardhat_network_config: RpcHardhatNetworkConfig { forking: None },
        accounts: vec![AccountConfig {
            private_key: SecretKey::from_str(PRIVATE_KEY)
                .expect("should construct private key from string"),
            balance: U256::ZERO,
        }],
        block_gas_limit: U256::from(30_000_000),
        chain_id: 1,
        coinbase: Address::from_low_u64_ne(1),
        gas: U256::from(30_000_000),
        hardfork: SpecId::LATEST,
        initial_base_fee_per_gas: Some(U256::from(1000000000)),
        initial_date: Some(SystemTime::now()),
        network_id: 123,
        cache_dir: cache_dir.path().to_path_buf(),
    })
    .await
    .unwrap();

    let address = server.local_addr();
    tokio::spawn(async move { server.serve().await.unwrap() });

    TestFixture {
        server_address: address,
        _cache_dir: cache_dir,
    }
}

async fn submit_request(address: &SocketAddr, request: &RpcRequest<MethodInvocation>) -> String {
    tracing_subscriber::fmt::Subscriber::builder()
        .with_max_level(Level::INFO)
        .with_test_writer()
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
    fixture: &TestFixture,
    method: MethodInvocation,
    response: ResponseT,
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
        data: jsonrpc::ResponseData::Success { result: response },
    };

    let unparsed_response = submit_request(&fixture.server_address, &request).await;

    let actual_response: jsonrpc::Response<ResponseT> =
        serde_json::from_str(&unparsed_response).expect("should deserialize from JSON");

    assert_eq!(actual_response, expected_response);
}

#[tokio::test]
async fn test_accounts() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::Accounts()),
        vec![private_key_to_address(&Secp256k1::signing_only(), PRIVATE_KEY).unwrap()],
    )
    .await;
}

#[tokio::test]
async fn test_block_number() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::BlockNumber()),
        U256::ZERO,
    )
    .await;
}

#[tokio::test]
async fn test_chain_id() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::ChainId()),
        U64::from(1),
    )
    .await;
}

#[tokio::test]
async fn test_coinbase() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::Coinbase()),
        Address::from_low_u64_ne(1),
    )
    .await;
}

#[tokio::test]
async fn test_evm_increase_time() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::EvmIncreaseTime(U256OrUsize::U256(
            U256::from(12345),
        ))),
        String::from("12345"),
    )
    .await;
}

#[tokio::test]
async fn test_evm_mine() {
    let server = start_server().await;
    verify_response(
        &server,
        MethodInvocation::Eth(EthMethodInvocation::EvmMine(Some(U256OrUsize::U256(
            U256::from(2147483647),
        )))),
        String::from("0"),
    )
    .await;
    verify_response(
        &server,
        MethodInvocation::Eth(EthMethodInvocation::EvmMine(Some(U256OrUsize::Usize(
            2147483647,
        )))),
        String::from("0"),
    )
    .await;
    verify_response(
        &server,
        MethodInvocation::Eth(EthMethodInvocation::EvmMine(None)),
        String::from("0"),
    )
    .await;
}

#[tokio::test]
async fn test_evm_set_next_block_timestamp() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::EvmSetNextBlockTimestamp(
            U256OrUsize::U256(U256::from(2147483647)),
        )),
        String::from("2147483647"),
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
        U256::ZERO,
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
        U256::ZERO,
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
        ZeroXPrefixedBytes::from(Bytes::from_static(b"")),
    )
    .await;
}

#[tokio::test]
async fn test_get_filter_changes() {
    let server = start_server().await;

    let filter_id = U256::from(1);

    // install a filter so that we can get its changes
    verify_response(
        &server,
        MethodInvocation::Eth(EthMethodInvocation::NewPendingTransactionFilter()),
        filter_id,
    )
    .await;

    verify_response(
        &server,
        MethodInvocation::Eth(EthMethodInvocation::GetFilterChanges(filter_id)),
        FilteredEvents::NewPendingTransactions(Vec::<B256>::new()),
    )
    .await;
}

#[tokio::test]
async fn test_get_filter_logs() {
    // TODO: when eth_newFilter is implemented for https://github.com/NomicFoundation/rethnet/issues/114
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
        U256::ZERO,
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
        U256::ZERO,
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
        U256::ZERO,
    )
    .await;
}

#[tokio::test]
async fn test_net_listening() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::NetListening()),
        true,
    )
    .await;
}

#[tokio::test]
async fn test_net_peer_count() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::NetPeerCount()),
        U64::ZERO,
    )
    .await;
}

#[tokio::test]
async fn test_net_version() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::NetVersion()),
        String::from("123"),
    )
    .await;
}

#[tokio::test]
async fn test_new_pending_transaction_filter_success() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::NewPendingTransactionFilter()),
        U256::from(1),
    )
    .await;
}

#[tokio::test]
async fn test_impersonate_account() {
    verify_response(
        &start_server().await,
        MethodInvocation::Hardhat(HardhatMethodInvocation::ImpersonateAccount(
            Address::from_low_u64_ne(1),
        )),
        true,
    )
    .await;
}

#[tokio::test]
async fn test_hardhat_mine() {
    let server = start_server().await;
    verify_response(
        &server,
        MethodInvocation::Hardhat(HardhatMethodInvocation::Mine(
            None, // block count
            None, // interval
        )),
        true,
    )
    .await;
    verify_response(
        &server,
        MethodInvocation::Hardhat(HardhatMethodInvocation::Mine(
            Some(U256::from(10)), // block count
            None,                 // interval
        )),
        true,
    )
    .await;
    verify_response(
        &server,
        MethodInvocation::Hardhat(HardhatMethodInvocation::Mine(
            None,                 // block count
            Some(U256::from(10)), // interval
        )),
        true,
    )
    .await;
    verify_response(
        &server,
        MethodInvocation::Hardhat(HardhatMethodInvocation::Mine(
            Some(U256::from(10)),   // block count
            Some(U256::from(5000)), // interval
        )),
        true,
    )
    .await;
}

#[tokio::test]
async fn test_interval_mine() {
    verify_response(
        &start_server().await,
        MethodInvocation::Hardhat(HardhatMethodInvocation::IntervalMine()),
        true,
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
        true,
    )
    .await;

    verify_response(
        &server_address,
        MethodInvocation::Eth(EthMethodInvocation::GetBalance(
            address,
            Some(BlockSpec::latest()),
        )),
        new_balance,
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
        true,
    )
    .await;

    verify_response(
        &server_address,
        MethodInvocation::Eth(EthMethodInvocation::GetTransactionCount(
            address,
            Some(BlockSpec::latest()),
        )),
        new_nonce,
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
        true,
    )
    .await;

    verify_response(
        &server_address,
        MethodInvocation::Eth(EthMethodInvocation::GetCode(
            address,
            Some(BlockSpec::latest()),
        )),
        new_code.clone(),
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
        true,
    )
    .await;

    verify_response(
        &server_address,
        MethodInvocation::Eth(EthMethodInvocation::GetStorageAt(
            address,
            U256::ZERO,
            Some(BlockSpec::latest()),
        )),
        new_storage_value,
    )
    .await;
}

#[tokio::test]
async fn test_sign() {
    // the expected response for this test case was created by submitting the same request to a
    // default-configured instance of Hardhat Network.
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::Sign(
            Address::from_str("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266").unwrap(),
            Bytes::from(hex::decode("deadbeef").unwrap()).into(),
        )),
        Signature::from_str("0xa114c834af73872c6c9efe918d85b0b1b34a486d10f9011e2630e28417c828c060dbd65cda67e73d52ebb7c555260621dbc1b0b4036acb61086bba091ac3f1641b").unwrap(),
    ).await;
}

#[tokio::test]
async fn test_stop_impersonating_account() {
    let server_address = start_server().await;

    // verify that stopping the impersonation of an account that wasn't already being impersonated
    // results in a `false` return value:
    verify_response(
        &server_address,
        MethodInvocation::Hardhat(HardhatMethodInvocation::StopImpersonatingAccount(
            Address::from_low_u64_ne(1),
        )),
        false,
    )
    .await;

    // verify that stopping the impersonation of an account that WAS already being impersonated
    // results in a `false` return value:
    verify_response(
        &server_address,
        MethodInvocation::Hardhat(HardhatMethodInvocation::ImpersonateAccount(
            Address::from_low_u64_ne(1),
        )),
        true,
    )
    .await;
    verify_response(
        &server_address,
        MethodInvocation::Hardhat(HardhatMethodInvocation::StopImpersonatingAccount(
            Address::from_low_u64_ne(1),
        )),
        true,
    )
    .await;
}

#[tokio::test]
async fn test_uninstall_filter_success() {
    let server = start_server().await;

    let filter_id = U256::from(1);

    // install a filter so that we can uninstall it
    verify_response(
        &server,
        MethodInvocation::Eth(EthMethodInvocation::NewPendingTransactionFilter()),
        filter_id,
    )
    .await;

    verify_response(
        &server,
        MethodInvocation::Eth(EthMethodInvocation::UninstallFilter(filter_id)),
        true,
    )
    .await;
}

#[tokio::test]
async fn test_uninstall_filter_nonexistent_filter() {
    let server = start_server().await;

    let filter_id = U256::from(99);

    verify_response(
        &server,
        MethodInvocation::Eth(EthMethodInvocation::UninstallFilter(filter_id)),
        false,
    )
    .await;
}

#[tokio::test]
async fn test_unsubscribe() {
    // TODO: when eth_subscribe is implemented for https://github.com/NomicFoundation/rethnet/issues/114
}

#[tokio::test]
async fn test_web3_client_version() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::Web3ClientVersion()),
        String::from(&format!(
            "edr/{}/revm/{}",
            env!("CARGO_PKG_VERSION"),
            env!("REVM_VERSION"),
        )),
    )
    .await;
}

#[tokio::test]
async fn test_web3_sha3() {
    verify_response(
        &start_server().await,
        MethodInvocation::Eth(EthMethodInvocation::Web3Sha3(
            Bytes::from_static(b"").into(),
        )),
        KECCAK_EMPTY,
    )
    .await;
}
