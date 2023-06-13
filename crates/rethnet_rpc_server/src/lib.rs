use std::sync::Arc;

use axum::{
    extract::{Json, State},
    Router,
};
use revm::db::components::state::StateRef;
use tokio::sync::Mutex;

use rethnet_eth::{
    remote::{
        client::Request as RpcRequest,
        jsonrpc,
        methods::{eth::EthMethodInvocation, hardhat::HardhatMethodInvocation, MethodInvocation},
    },
    U256,
};
use rethnet_evm::{
    state::{AccountModifierFn, HybridState, RethnetLayer, StateDebug},
    AccountInfo, KECCAK_EMPTY,
};

type StateType = Arc<Mutex<HybridState<RethnetLayer>>>;

pub async fn router(state: StateType) -> Router {
    Router::new().route(
        "/",
        axum::routing::post(
            |State(rethnet_state): State<StateType>, payload: Json<serde_json::Value>| async move {
                match serde_json::from_value::<RpcRequest>(payload.0.clone()) {
                    Ok(RpcRequest {
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
                    },
                    Ok(RpcRequest { version: _, id, method }) => {
                        match method {
                            MethodInvocation::Eth(EthMethodInvocation::GetBalance(address, _block_spec)) => {
                                Json(serde_json::json!(jsonrpc::Response {
                                    jsonrpc: jsonrpc::Version::V2_0,
                                    id,
                                    data: match (*(rethnet_state.lock().await)).basic(address) {
                                        Ok(Some(account_info)) => {
                                            jsonrpc::ResponseData::<U256>::Success { result: account_info.balance }
                                        },
                                        Ok(None) => {
                                            jsonrpc::ResponseData::<U256>::new_error(0, "No such account", None)
                                        }
                                        Err(e) => { jsonrpc::ResponseData::<U256>::new_error(0, &e.to_string(), None) }
                                    }
                                }))
                            }
                            MethodInvocation::Hardhat(HardhatMethodInvocation::SetBalance(address, balance)) => {
                                Json(serde_json::json!(jsonrpc::Response {
                                    jsonrpc: jsonrpc::Version::V2_0,
                                    id,
                                    data: match (*(rethnet_state.lock().await)).modify_account(
                                        address,
                                        AccountModifierFn::new(
                                            Box::new(move |account_balance, _, _| { *account_balance = balance })
                                        ),
                                        &|| {
                                            Ok(AccountInfo { balance, nonce: 0, code: None, code_hash: KECCAK_EMPTY })
                                        },
                                    ) {
                                        Ok(()) => { jsonrpc::ResponseData::<()>::Success { result: () } },
                                        Err(e) => { jsonrpc::ResponseData::<()>::new_error(0, &e.to_string(), None) }
                                    }
                                }))
                            }
                            _ => { // TODO: after adding all the methods here, eliminate this
                                   // catch-all match arm.
                                Json(serde_json::json!(jsonrpc::Response {
                                    jsonrpc: jsonrpc::Version::V2_0,
                                    id,
                                    data: jsonrpc::ResponseData::<serde_json::Value>::Error { error: jsonrpc::Error {
                                        code: 0,
                                        message: String::from("unsupported JSON-RPC method"),
                                        data: Some(serde_json::to_value(method).unwrap()),
                                    }}
                                }))
                            }
                        }
                    }
                    Err(error) => {
                        Json(serde_json::json!(jsonrpc::Response {
                            jsonrpc: jsonrpc::Version::V2_0,
                            id: jsonrpc::Id::Str(String::from("unknown")),
                            data: jsonrpc::ResponseData::<()>::new_error(
                                -32700, // from the JSON-RPC spec
                                "Parse error",
                                match serde_json::to_value(error.to_string()) {
                                    Ok(error) => { Some(error) }
                                    Err(_) => { None }
                                })
                        }))
                    }
                }
            }
        )
    )
    .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{body::Body, http::Request};
    use rethnet_eth::{
        remote::{jsonrpc, BlockSpec},
        Address,
    };
    use revm::primitives::state::AccountInfo;
    use std::net::{SocketAddr, TcpListener};

    fn start_server() -> SocketAddr {
        let listener = TcpListener::bind("0.0.0.0:0".parse::<SocketAddr>().unwrap()).unwrap();
        let address = listener.local_addr().unwrap();

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

        let rethnet_state = Arc::new(Mutex::new(HybridState::with_accounts(accounts)));

        tokio::spawn(async move {
            axum::Server::from_tcp(listener)
                .unwrap()
                .serve(router(rethnet_state).await.into_make_service())
                .await
                .unwrap();
        });

        address
    }

    async fn submit_request(address: &SocketAddr, request: &RpcRequest) -> String {
        String::from_utf8(
            hyper::body::to_bytes(
                hyper::Client::new()
                    .request(
                        Request::post(format!("http://{address}/"))
                            .header("Content-Type", "application/json")
                            .body(Body::from(serde_json::to_string(&request).unwrap()))
                            .unwrap(),
                    )
                    .await
                    .unwrap()
                    .into_body(),
            )
            .await
            .unwrap()
            .to_vec(),
        )
        .expect("should decode response from UTF-8")
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
            serde_json::from_str(&submit_request(&start_server(), &request).await)
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
            serde_json::from_str(&submit_request(&start_server(), &request).await)
                .expect("should deserialize from JSON");

        assert_eq!(actual_response, expected_response);
    }

    #[tokio::test]
    async fn test_set_balance_success() {
        let server_address = start_server();

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
}
