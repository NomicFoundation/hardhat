use std::net::{SocketAddr, TcpListener};
use std::sync::Arc;

use axum::{
    extract::{Json, State},
    Router,
};
use hashbrown::HashMap;
use rethnet_eth::remote::ZeroXPrefixedBytes;
use tokio::sync::RwLock;

use rethnet_eth::{
    remote::{
        client::Request as RpcRequest,
        jsonrpc,
        methods::{eth::EthMethodInvocation, hardhat::HardhatMethodInvocation, MethodInvocation},
    },
    Address, U256,
};
use rethnet_evm::{
    state::{AccountModifierFn, HybridState, StateError, SyncState},
    AccountInfo, Bytecode, KECCAK_EMPTY,
};

type StateType = Arc<RwLock<Box<dyn SyncState<StateError>>>>;

pub async fn router(state: StateType) -> Router {
    Router::new()
        .route(
            "/",
            axum::routing::post(
                |State(rethnet_state): State<StateType>, payload: Json<RpcRequest>| async move {
                    match payload {
                        Json(RpcRequest {
                            version,
                            id,
                            method: _,
                        }) if version != jsonrpc::Version::V2_0 => {
                            Json(serde_json::json!(jsonrpc::Response {
                                jsonrpc: jsonrpc::Version::V2_0,
                                id,
                                data: jsonrpc::ResponseData::<serde_json::Value>::new_error(
                                    0,
                                    "unsupported JSON-RPC version",
                                    match serde_json::to_value(version) {
                                        Ok(version) => Some(version),
                                        Err(_) => None,
                                    },
                                )
                            }))
                        }
                        Json(RpcRequest {
                            version: _,
                            id,
                            method,
                        }) => {
                            match method {
                                MethodInvocation::Eth(EthMethodInvocation::GetBalance(
                                    address,
                                    _block_spec,
                                )) => Json(serde_json::json!(jsonrpc::Response {
                                    jsonrpc: jsonrpc::Version::V2_0,
                                    id,
                                    data: match (*rethnet_state).read().await.basic(address) {
                                        Ok(Some(account_info)) =>
                                            jsonrpc::ResponseData::<U256>::Success {
                                                result: account_info.balance
                                            },
                                        Ok(None) => jsonrpc::ResponseData::<U256>::new_error(
                                            0,
                                            "No such account",
                                            None
                                        ),
                                        Err(e) => jsonrpc::ResponseData::<U256>::new_error(
                                            0,
                                            &e.to_string(),
                                            None
                                        ),
                                    }
                                })),
                                MethodInvocation::Eth(EthMethodInvocation::GetCode(
                                    address,
                                    _block_spec,
                                )) => {
                                    Json(serde_json::json!(
                                        jsonrpc::Response {
                                            jsonrpc: jsonrpc::Version::V2_0,
                                            id,
                                            data:
                                                match (*rethnet_state).read().await.basic(address) {
                                                    Ok(Some(account_info)) =>
                                                        match (*rethnet_state)
                                                            .read()
                                                            .await
                                                            .code_by_hash(account_info.code_hash)
                                                        {
                                                            Ok(code) => jsonrpc::ResponseData::<
                                                                ZeroXPrefixedBytes,
                                                            >::Success {
                                                                result: ZeroXPrefixedBytes::from(
                                                                    code.bytecode
                                                                ),
                                                            },
                                                            Err(error) => jsonrpc::ResponseData::<
                                                                ZeroXPrefixedBytes,
                                                            >::new_error(
                                                                0,
                                                                &error.to_string(),
                                                                None
                                                            ),
                                                        },
                                                    Ok(None) => jsonrpc::ResponseData::<
                                                        ZeroXPrefixedBytes,
                                                    >::new_error(
                                                        0, "No such account", None
                                                    ),
                                                    Err(e) => jsonrpc::ResponseData::<
                                                        ZeroXPrefixedBytes,
                                                    >::new_error(
                                                        0, &e.to_string(), None
                                                    ),
                                                }
                                        }
                                    ))
                                }
                                MethodInvocation::Eth(
                                    EthMethodInvocation::GetStorageAt(address, position, _block_spec)
                                ) => Json(serde_json::json!(jsonrpc::Response {
                                    jsonrpc: jsonrpc::Version::V2_0,
                                    id,
                                    data: match (*rethnet_state).read().await.storage(address, position) {
                                        Ok(value) => jsonrpc::ResponseData::<U256>::Success { result: value },
                                        Err(e) => jsonrpc::ResponseData::<U256>::new_error(0, &e.to_string(), None),
                                    }
                                })),
                                MethodInvocation::Eth(
                                    EthMethodInvocation::GetTransactionCount(address, _block_spec),
                                ) => Json(serde_json::json!(jsonrpc::Response {
                                    jsonrpc: jsonrpc::Version::V2_0,
                                    id,
                                    data: match (*rethnet_state).read().await.basic(address) {
                                        Ok(Some(account_info)) =>
                                            jsonrpc::ResponseData::<U256>::Success {
                                                result: U256::from(account_info.nonce)
                                            },
                                        Ok(None) => jsonrpc::ResponseData::<U256>::new_error(
                                            0,
                                            "No such account",
                                            None
                                        ),
                                        Err(e) => jsonrpc::ResponseData::<U256>::new_error(
                                            0,
                                            &e.to_string(),
                                            None
                                        ),
                                    }
                                })),
                                MethodInvocation::Hardhat(HardhatMethodInvocation::SetBalance(
                                    address,
                                    balance,
                                )) => Json(serde_json::json!(jsonrpc::Response {
                                    jsonrpc: jsonrpc::Version::V2_0,
                                    id,
                                    data: match (*rethnet_state).write().await.modify_account(
                                        address,
                                        AccountModifierFn::new(Box::new(
                                            move |account_balance, _, _| {
                                                *account_balance = balance
                                            }
                                        )),
                                        &|| Ok(AccountInfo {
                                            balance,
                                            nonce: 0,
                                            code: None,
                                            code_hash: KECCAK_EMPTY
                                        }),
                                    ) {
                                        Ok(()) =>
                                            jsonrpc::ResponseData::<()>::Success { result: () },
                                        Err(e) => jsonrpc::ResponseData::<()>::new_error(
                                            0,
                                            &e.to_string(),
                                            None
                                        ),
                                    }
                                })),
                                MethodInvocation::Hardhat(HardhatMethodInvocation::SetCode(
                                    address,
                                    code,
                                )) => {
                                    let code_1 = code.clone();
                                    let code_2 = code.clone();
                                    Json(serde_json::json!(jsonrpc::Response {
                                        jsonrpc: jsonrpc::Version::V2_0,
                                        id,
                                        data: match (*rethnet_state).write().await.modify_account(
                                            address,
                                            AccountModifierFn::new(Box::new(
                                                move |_, _, account_code| {
                                                    *account_code = Some(Bytecode::new_raw(
                                                        code_1.clone().into(),
                                                    ))
                                                }
                                            )),
                                            &|| Ok(AccountInfo {
                                                balance: U256::ZERO,
                                                nonce: 0,
                                                code: Some(Bytecode::new_raw(
                                                    code_2.clone().into()
                                                )),
                                                code_hash: KECCAK_EMPTY
                                            }),
                                        ) {
                                            Ok(()) =>
                                                jsonrpc::ResponseData::<()>::Success { result: () },
                                            Err(e) => jsonrpc::ResponseData::<()>::new_error(
                                                0,
                                                &e.to_string(),
                                                None
                                            ),
                                        }
                                    }))
                                }
                                MethodInvocation::Hardhat(HardhatMethodInvocation::SetNonce(
                                    address,
                                    nonce,
                                )) => Json(serde_json::json!(jsonrpc::Response {
                                    jsonrpc: jsonrpc::Version::V2_0,
                                    id,
                                    data: match TryInto::<u64>::try_into(nonce) {
                                        Ok(nonce) => {
                                            match (*rethnet_state).write().await.modify_account(
                                                address,
                                                AccountModifierFn::new(Box::new(
                                                    move |_, account_nonce, _| {
                                                        *account_nonce = nonce
                                                    },
                                                )),
                                                &|| {
                                                    Ok(AccountInfo {
                                                        balance: U256::ZERO,
                                                        nonce,
                                                        code: None,
                                                        code_hash: KECCAK_EMPTY,
                                                    })
                                                },
                                            ) {
                                                Ok(()) => jsonrpc::ResponseData::<()>::Success {
                                                    result: (),
                                                },
                                                Err(error) => {
                                                    jsonrpc::ResponseData::<()>::new_error(
                                                        0,
                                                        &error.to_string(),
                                                        None,
                                                    )
                                                }
                                            }
                                        }
                                        Err(error) => jsonrpc::ResponseData::<()>::new_error(
                                            0,
                                            &error.to_string(),
                                            None
                                        ),
                                    }
                                })),
                                _ => {
                                    // TODO: after adding all the methods here, eliminate this
                                    // catch-all match arm.
                                    Json(serde_json::json!(jsonrpc::Response {
                                        jsonrpc: jsonrpc::Version::V2_0,
                                        id,
                                        data: jsonrpc::ResponseData::<serde_json::Value>::Error {
                                            error: jsonrpc::Error {
                                                code: 0,
                                                message: String::from(
                                                    "unsupported JSON-RPC method"
                                                ),
                                                data: match serde_json::to_value(method) {
                                                    Ok(value) => Some(value),
                                                    Err(_) => None,
                                                }
                                            }
                                        }
                                    }))
                                }
                            }
                        }
                    }
                },
            ),
        )
        .with_state(state)
}

/// accepts an address to listen on (which could be a wildcard like 0.0.0.0:0), and a set of
/// initial accounts to initialize the state.
/// returns the address that the server is listening on (with any input wildcards resolved).
pub async fn run(
    address: SocketAddr,
    genesis_accounts: HashMap<Address, AccountInfo>,
) -> Result<SocketAddr, std::io::Error> {
    let listener = TcpListener::bind(address)?;
    let address = listener.local_addr()?;

    let mut accounts: hashbrown::HashMap<Address, AccountInfo> = Default::default();
    accounts.insert(
        Address::from_low_u64_ne(1),
        AccountInfo {
            code: None,
            code_hash: KECCAK_EMPTY,
            balance: U256::ZERO,
            nonce: 0,
        },
    );

    let rethnet_state: StateType = Arc::new(RwLock::new(Box::new(HybridState::with_accounts(
        genesis_accounts,
    ))));

    tokio::spawn(async move {
        axum::Server::from_tcp(listener)
            .unwrap()
            .serve(router(rethnet_state).await.into_make_service())
            .await
            .unwrap();
    });

    Ok(address)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rethnet_eth::{remote::BlockSpec, Bytes};

    async fn start_server() -> SocketAddr {
        let mut accounts: hashbrown::HashMap<Address, AccountInfo> = Default::default();
        accounts.insert(
            Address::from_low_u64_ne(1),
            AccountInfo {
                code: None,
                code_hash: KECCAK_EMPTY,
                balance: U256::ZERO,
                nonce: 0,
            },
        );

        run("127.0.0.1:0".parse::<SocketAddr>().unwrap(), accounts)
            .await
            .unwrap()
    }

    async fn submit_request(address: &SocketAddr, request: &RpcRequest) -> String {
        let url = format!("http://{address}/");
        let body = serde_json::to_string(&request).expect("should serialize request to JSON");
        reqwest::Client::new()
            .post(&url)
            .header(reqwest::header::CONTENT_TYPE, "application/json")
            .body(body.clone())
            .send()
            .await
            .expect(&format!("should send to url '{url}' request body '{body}'"))
            .text()
            .await
            .expect(&format!("should get full response text"))
    }

    #[tokio::test]
    async fn test_get_balance_nonexistent_account() {
        let request = RpcRequest {
            version: jsonrpc::Version::V2_0,
            id: jsonrpc::Id::Num(0),
            method: MethodInvocation::Eth(EthMethodInvocation::GetBalance(
                Address::from_low_u64_ne(2),
                BlockSpec::Tag(String::from("latest")),
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
                BlockSpec::Tag(String::from("latest")),
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
                BlockSpec::Tag(String::from("latest")),
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
                BlockSpec::Tag(String::from("latest")),
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
                BlockSpec::Tag(String::from("latest")),
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
                BlockSpec::Tag(String::from("latest")),
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
                BlockSpec::Tag(String::from("latest")),
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
            method: MethodInvocation::Hardhat(HardhatMethodInvocation::SetNonce(
                address, new_nonce,
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
            method: MethodInvocation::Eth(EthMethodInvocation::GetTransactionCount(
                address,
                BlockSpec::Tag(String::from("latest")),
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
            method: MethodInvocation::Eth(EthMethodInvocation::GetCode(
                address,
                BlockSpec::Tag(String::from("latest")),
            )),
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
}
