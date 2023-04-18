use std::{
    io,
    sync::atomic::{AtomicU64, Ordering},
};

use itertools::Itertools;
use revm_primitives::{AccountInfo, Address, Bytecode, B256, U256};

use super::{eth, jsonrpc, BlockSpec, GetLogsInput, MethodInvocation, SerializableBlockSpec};

/// Specialized error types
#[derive(thiserror::Error, Debug)]
pub enum RpcClientError {
    /// The remote node's response did not conform to the expected format
    #[error("Response body `{body}` did not contain the expected type: `{expected_type}`: {msg}")]
    InterpretationError {
        /// The error message
        msg: String,
        /// The Rust type which was expected to be decoded from the JSON received
        expected_type: &'static str,
        /// The body of the response given by the remote node
        body: String,
    },

    /// The message could not be sent to the remote node
    #[error(transparent)]
    FailedToSend(reqwest::Error),

    /// The remote node failed to reply with the body of the response
    #[error("The response text was corrupted: {0}.")]
    CorruptedResponse(reqwest::Error),

    /// The JSON-RPC returned an error.
    #[error("{error}. Request: {request}")]
    JsonRpcError {
        /// The JSON-RPC error
        error: jsonrpc::Error,
        /// The request JSON
        request: String,
    },

    /// Some other error from an underlying dependency
    #[error(transparent)]
    OtherError(#[from] io::Error),
}

#[derive(serde::Serialize)]
struct Request<'a> {
    version: jsonrpc::Version,
    #[serde(flatten)]
    method: &'a MethodInvocation,
    id: &'a jsonrpc::Id,
}

struct BatchResponse {
    text: String,
    request_ids: Vec<jsonrpc::Id>,
    request_strings: Vec<String>,
}

/// A client for executing RPC methods on a remote Ethereum node
#[derive(Debug)]
pub struct RpcClient {
    url: String,
    client: reqwest::Client,
    next_id: AtomicU64,
}

impl RpcClient {
    fn extract_response<T>(response: &str, request_id: &jsonrpc::Id) -> Result<T, jsonrpc::Error>
    where
        T: for<'a> serde::Deserialize<'a>,
    {
        let response: jsonrpc::Response<T> =
            serde_json::from_str(response).unwrap_or_else(|error| {
                panic!(
                    "Response `{response}` failed to parse with expected type `{expected_type}`, due to error: {error}",
                    expected_type = std::any::type_name::<T>()
                )
            });

        debug_assert_eq!(response.id, *request_id);

        response.data.into_result()
    }

    fn hash_string(input: &str) -> String {
        use std::hash::Hasher;
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        hasher.write(input.as_bytes());
        hasher.finish().to_string()
    }

    fn make_cache_path(&self, request_body: &str) -> std::path::PathBuf {
        // TODO: consider using a better path for this directory. currently, for test runs,
        // it's going to crates/rethnet_eth/remote_node_cache. shouldn't it be rooted somewhere
        // more accessible/convenient?
        let directory = format!("remote_node_cache/{}", Self::hash_string(&self.url));

        // ensure directory exists
        std::fs::DirBuilder::new()
            .recursive(true)
            .create(directory.clone())
            .expect("failed to create on-disk RPC response cache");

        std::path::Path::new(&directory).join(format!("{}.json", Self::hash_string(request_body)))
    }

    fn read_response_from_cache(&self, request_body: &str) -> Option<String> {
        if let Ok(mut file) = std::fs::File::open(&self.make_cache_path(request_body)) {
            let mut response = String::new();
            if io::Read::read_to_string(&mut file, &mut response).is_ok() {
                Some(response)
            } else {
                None
            }
        } else {
            None
        }
    }

    fn write_response_to_cache(&self, request_body: &str, response: &str) {
        std::fs::write(&self.make_cache_path(request_body), response.as_bytes())
            .expect("failed to write to on-disk RPC response cache")
    }

    /// returns response text
    async fn send_request_body(&self, request_body: &str) -> Result<String, RpcClientError> {
        if let Some(cached_response) = self.read_response_from_cache(request_body) {
            Ok(cached_response)
        } else {
            let response = self
                .client
                .post(self.url.to_string())
                .body(request_body.to_owned())
                .send()
                .await
                .map_err(RpcClientError::FailedToSend)?
                .text()
                .await
                .map_err(RpcClientError::CorruptedResponse)?;

            self.write_response_to_cache(request_body, &response);
            Ok(response)
        }
    }

    async fn call<T>(&self, input: &MethodInvocation) -> Result<T, RpcClientError>
    where
        T: for<'a> serde::Deserialize<'a>,
    {
        let request_id = jsonrpc::Id::Num(self.next_id.fetch_add(1, Ordering::Relaxed));
        let request = serde_json::json!(Request {
            version: crate::remote::jsonrpc::Version::V2_0,
            id: &request_id,
            method: input,
        })
        .to_string();

        self.send_request_body(&request).await.and_then(|response| {
            Self::extract_response(&response, &request_id)
                .map_err(|error| RpcClientError::JsonRpcError { error, request })
        })
    }

    async fn batch_call(
        &self,
        inputs: &[MethodInvocation],
    ) -> Result<BatchResponse, RpcClientError> {
        let (request_strings, request_ids): (Vec<String>, Vec<jsonrpc::Id>) = inputs
            .iter()
            .map(|i| {
                let id = jsonrpc::Id::Num(self.next_id.fetch_add(1, Ordering::Relaxed));
                let json = serde_json::json!(Request {
                    version: crate::remote::jsonrpc::Version::V2_0,
                    id: &id,
                    method: i,
                })
                .to_string();
                (json, id)
            })
            .unzip();

        let request_body = format!("[{}]", request_strings.join(","));

        self.send_request_body(&request_body)
            .await
            .map(|response| BatchResponse {
                text: response,
                request_ids,
                request_strings,
            })
    }

    /// Create a new RpcClient instance, given a remote node URL.
    pub fn new(url: &str) -> Self {
        RpcClient {
            url: url.to_string(),
            client: reqwest::Client::new(),
            next_id: AtomicU64::new(0),
        }
    }

    /// eth_getTransactionByHash
    pub async fn get_tx_by_hash(&self, tx_hash: &B256) -> Result<eth::Transaction, RpcClientError> {
        self.call(&MethodInvocation::TxByHash(*tx_hash)).await
    }

    /// eth_getTransactionReceipt
    pub async fn get_tx_receipt(
        &self,
        tx_hash: &B256,
    ) -> Result<eth::TransactionReceipt, RpcClientError> {
        self.call(&MethodInvocation::TxReceipt(*tx_hash)).await
    }

    /// eth_getLogs
    pub async fn get_logs(
        &self,
        from_block: BlockSpec,
        to_block: BlockSpec,
        address: &Address,
    ) -> Result<Vec<eth::Log>, RpcClientError> {
        self.call(&MethodInvocation::Logs(GetLogsInput {
            from_block: from_block.into(),
            to_block: to_block.into(),
            address: *address,
        }))
        .await
    }

    /// eth_getBlockByHash
    pub async fn get_block_by_hash(
        &self,
        hash: &B256,
        include_transactions: bool,
    ) -> Result<eth::Block<eth::Transaction>, RpcClientError> {
        self.call(&MethodInvocation::BlockByHash(*hash, include_transactions))
            .await
    }

    /// eth_getBlockByNumber
    pub async fn get_block_by_number(
        &self,
        number: BlockSpec,
        include_transactions: bool,
    ) -> Result<eth::Block<eth::Transaction>, RpcClientError> {
        self.call(&MethodInvocation::Block(
            number.into(),
            include_transactions,
        ))
        .await
    }

    /// eth_getBlockByNumber("latest")
    pub async fn get_latest_block(&self) -> Result<eth::Block<B256>, RpcClientError> {
        self.call(&MethodInvocation::Block(
            SerializableBlockSpec::Tag("latest".to_string()),
            false,
        ))
        .await
    }

    /// eth_getTransactionCount
    pub async fn get_transaction_count(
        &self,
        address: &Address,
        block: BlockSpec,
    ) -> Result<U256, RpcClientError> {
        self.call(&MethodInvocation::TxCount(*address, block.into()))
            .await
    }

    /// eth_getStorageAt
    pub async fn get_storage_at(
        &self,
        address: &Address,
        position: U256,
        block: BlockSpec,
    ) -> Result<U256, RpcClientError> {
        self.call(&MethodInvocation::StorageAt(
            *address,
            position,
            block.into(),
        ))
        .await
    }

    /// Submit a consolidated batch of RPC method invocations in order to obtain the set of data
    /// contained in AccountInfo.
    pub async fn get_account_info(
        &self,
        address: &Address,
        block: BlockSpec,
    ) -> Result<AccountInfo, RpcClientError> {
        let inputs = Vec::from([
            MethodInvocation::Balance(*address, block.clone().into()),
            MethodInvocation::TxCount(*address, block.clone().into()),
            MethodInvocation::Code(*address, block.into()),
        ]);

        let response = self.batch_call(&inputs).await?;

        type BatchResult = (
            jsonrpc::Response<U256>,
            jsonrpc::Response<U256>,
            jsonrpc::Response<jsonrpc::ZeroXPrefixedBytes>,
        );

        let results: BatchResult = serde_json::from_str(&response.text).map_err(|err| {
            RpcClientError::InterpretationError {
                msg: err.to_string(),
                expected_type: std::any::type_name::<BatchResult>(),
                body: response.text.to_owned(),
            }
        })?;

        debug_assert_eq!(results.0.id, response.request_ids[0]);
        debug_assert_eq!(results.1.id, response.request_ids[1]);
        debug_assert_eq!(results.2.id, response.request_ids[2]);

        let (balance_request, nonce_request, code_request) = response
            .request_strings
            .into_iter()
            .tuples()
            .next()
            .expect("request strings must contain 3 elements");

        let balance =
            results
                .0
                .data
                .into_result()
                .map_err(|error| RpcClientError::JsonRpcError {
                    error,
                    request: balance_request,
                })?;

        let nonce = results.1.data.into_result().map_or_else(
            |error| {
                Err(RpcClientError::JsonRpcError {
                    error,
                    request: nonce_request,
                })
            },
            |nonce| Ok(nonce.to()),
        )?;

        let code = results.2.data.into_result().map_or_else(
            |error| {
                Err(RpcClientError::JsonRpcError {
                    error,
                    request: code_request,
                })
            },
            |bytes| Ok(Bytecode::new_raw(bytes.inner)),
        )?;

        Ok(AccountInfo {
            balance,
            code_hash: code.hash(),
            code: Some(code),
            nonce,
        })
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use crate::{Address, Bytes, U256};

    use super::*;

    fn get_alchemy_url() -> String {
        match std::env::var_os("ALCHEMY_URL")
            .expect("ALCHEMY_URL environment variable not defined")
            .into_string()
            .expect("Couldn't convert OsString into a String")
        {
            url if url.is_empty() => panic!("ALCHEMY_URL environment variable is empty"),
            url => url,
        }
    }

    #[test_with::env(ALCHEMY_URL)]
    #[tokio::test]
    async fn get_tx_by_hash_success() {
        let alchemy_url = get_alchemy_url();

        let hash =
            B256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a")
                .expect("failed to parse hash from string");

        let tx: eth::Transaction = RpcClient::new(&alchemy_url)
            .get_tx_by_hash(&hash)
            .await
            .expect("failed to get transaction by hash");

        assert_eq!(
            tx.block_hash,
            Some(
                B256::from_str(
                    "0x88fadbb673928c61b9ede3694ae0589ac77ae38ec90a24a6e12e83f42f18c7e8"
                )
                .expect("couldn't parse data")
            )
        );
        assert_eq!(
            tx.block_number,
            Some(U256::from_str_radix("a74fde", 16).expect("couldn't parse data"))
        );
        assert_eq!(tx.hash, hash);
        assert_eq!(
            tx.from,
            Address::from_str("0x7d97fcdb98632a91be79d3122b4eb99c0c4223ee")
                .expect("couldn't parse data")
        );
        assert_eq!(
            tx.gas,
            U256::from_str_radix("30d40", 16).expect("couldn't parse data")
        );
        assert_eq!(
            tx.gas_price,
            Some(U256::from_str_radix("1e449a99b8", 16).expect("couldn't parse data"))
        );
        assert_eq!(
            tx.input,
            Bytes::from("0xa9059cbb000000000000000000000000e2c1e729e05f34c07d80083982ccd9154045dcc600000000000000000000000000000000000000000000000000000004a817c800")
        );
        assert_eq!(
            tx.nonce,
            U256::from_str_radix("653b", 16).expect("couldn't parse data")
        );
        assert_eq!(
            tx.r,
            U256::from_str_radix(
                "eb56df45bd355e182fba854506bc73737df275af5a323d30f98db13fdf44393a",
                16
            )
            .expect("couldn't parse data")
        );
        assert_eq!(
            tx.s,
            U256::from_str_radix(
                "2c6efcd210cdc7b3d3191360f796ca84cab25a52ed8f72efff1652adaabc1c83",
                16
            )
            .expect("couldn't parse data")
        );
        assert_eq!(
            tx.to,
            Some(
                Address::from_str("dac17f958d2ee523a2206206994597c13d831ec7")
                    .expect("couldn't parse data")
            )
        );
        assert_eq!(
            tx.transaction_index,
            Some(u64::from_str_radix("88", 16).expect("couldn't parse data"))
        );
        assert_eq!(
            tx.v,
            u64::from_str_radix("1c", 16).expect("couldn't parse data")
        );
        assert_eq!(
            tx.value,
            U256::from_str_radix("0", 16).expect("couldn't parse data")
        );
    }

    #[test_with::env(ALCHEMY_URL)]
    #[tokio::test]
    async fn get_tx_by_hash_dns_error() {
        let alchemy_url = "https://xxxeth-mainnet.g.alchemy.com/";

        let hash =
            B256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933051111")
                .expect("failed to parse hash from string");

        let error = RpcClient::new(alchemy_url)
            .get_tx_by_hash(&hash)
            .await
            .expect_err("should have failed to connect to a garbage domain name");

        if let RpcClientError::FailedToSend(error) = error {
            assert_eq!(error.to_string(), format!("error sending request for url ({alchemy_url}): error trying to connect: dns error: No such host is known. (os error 11001)"));
        } else {
            unreachable!("Invalid error");
        }
    }

    #[test_with::env(ALCHEMY_URL)]
    #[tokio::test]
    async fn get_tx_by_hash_bad_api_key() {
        let alchemy_url = "https://eth-mainnet.g.alchemy.com/v2/abcdefg";

        let hash =
            B256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933022222")
                .expect("failed to parse hash from string");

        let error = RpcClient::new(alchemy_url)
            .get_tx_by_hash(&hash)
            .await
            .expect_err("should have failed to interpret response as a Transaction");

        if let RpcClientError::JsonRpcError { error, .. } = error {
            assert_eq!(error.code, -32000);
            assert_eq!(error.message, "Must be authenticated!");
            assert!(error.data.is_none());
        } else {
            unreachable!("Invalid error");
        }
    }

    #[test_with::env(ALCHEMY_URL)]
    #[tokio::test]
    async fn get_tx_receipt_success() {
        let alchemy_url = get_alchemy_url();

        let hash =
            B256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a")
                .expect("failed to parse hash from string");

        let receipt: eth::TransactionReceipt = RpcClient::new(&alchemy_url)
            .get_tx_receipt(&hash)
            .await
            .expect("failed to get transaction by hash");

        assert_eq!(
            receipt.block_hash,
            Some(
                B256::from_str(
                    "0x88fadbb673928c61b9ede3694ae0589ac77ae38ec90a24a6e12e83f42f18c7e8"
                )
                .expect("couldn't parse data")
            )
        );
        assert_eq!(
            receipt.block_number,
            Some(U256::from_str_radix("a74fde", 16).expect("couldn't parse data"))
        );
        assert_eq!(receipt.contract_address, None);
        assert_eq!(
            receipt.cumulative_gas_used,
            U256::from_str_radix("56c81b", 16).expect("couldn't parse data")
        );
        assert_eq!(
            receipt.effective_gas_price,
            Some(U256::from_str_radix("1e449a99b8", 16).expect("couldn't parse data"))
        );
        assert_eq!(
            receipt.from,
            Address::from_str("0x7d97fcdb98632a91be79d3122b4eb99c0c4223ee")
                .expect("couldn't parse data")
        );
        assert_eq!(
            receipt.gas_used,
            Some(U256::from_str_radix("a0f9", 16).expect("couldn't parse data"))
        );
        assert_eq!(receipt.logs.len(), 1);
        assert_eq!(receipt.root, None);
        assert_eq!(receipt.status, Some(1));
        assert_eq!(
            receipt.to,
            Some(
                Address::from_str("dac17f958d2ee523a2206206994597c13d831ec7")
                    .expect("couldn't parse data")
            )
        );
        assert_eq!(receipt.transaction_hash, hash);
        assert_eq!(receipt.transaction_index, 136);
        assert_eq!(receipt.transaction_type, Some(0));
    }

    #[test_with::env(ALCHEMY_URL)]
    #[tokio::test]
    async fn get_tx_receipt_dns_error() {
        let alchemy_url = "https://xxxeth-mainnet.g.alchemy.com/";

        let hash =
            B256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5f")
                .expect("failed to parse hash from string");

        let error = RpcClient::new(alchemy_url)
            .get_tx_receipt(&hash)
            .await
            .expect_err("should have failed to connect to a garbage domain name");

        if let RpcClientError::FailedToSend(error) = error {
            assert_eq!(error.to_string(), format!("error sending request for url ({alchemy_url}): error trying to connect: dns error: No such host is known. (os error 11001)"));
        } else {
            unreachable!("Invalid error");
        }
    }

    #[test_with::env(ALCHEMY_URL)]
    #[tokio::test]
    async fn get_tx_receipt_bad_api_key() {
        let alchemy_url = "https://eth-mainnet.g.alchemy.com/v2/abcdefg";

        let hash =
            B256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5b")
                .expect("failed to parse hash from string");

        let error = RpcClient::new(alchemy_url)
            .get_tx_receipt(&hash)
            .await
            .expect_err("should have failed to interpret response as a Receipt");

        if let RpcClientError::JsonRpcError { error, .. } = error {
            assert_eq!(error.code, -32000);
            assert_eq!(error.message, "Must be authenticated!");
            assert!(error.data.is_none());
        } else {
            unreachable!("Invalid error");
        }
    }

    #[test_with::env(ALCHEMY_URL)]
    #[tokio::test]
    async fn get_logs_success() {
        let alchemy_url = get_alchemy_url();
        let logs = RpcClient::new(&alchemy_url)
            .get_logs(
                BlockSpec::Number(U256::from(10496585)),
                BlockSpec::Number(U256::from(10496585)),
                &Address::from_str("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
                    .expect("failed to parse data"),
            )
            .await
            .expect("failed to get logs");
        assert_eq!(logs.len(), 12);
        // TODO: assert more things about the log(s)
        // TODO: consider asserting something about the logs bloom
    }

    #[test_with::env(ALCHEMY_URL)]
    #[tokio::test]
    async fn get_block_by_hash_success() {
        let alchemy_url = get_alchemy_url();

        let hash =
            B256::from_str("0x71d5e7c8ff9ea737034c16e333a75575a4a94d29482e0c2b88f0a6a8369c1812")
                .expect("failed to parse hash from string");

        let block = RpcClient::new(&alchemy_url)
            .get_block_by_hash(&hash, true)
            .await
            .expect("should have succeeded");

        assert_eq!(block.hash, Some(hash));
        assert_eq!(block.transactions.len(), 192);
    }

    #[test_with::env(ALCHEMY_URL)]
    #[tokio::test]
    async fn get_block_by_number_success() {
        let alchemy_url = get_alchemy_url();

        let block_number = U256::from(16222385);

        let block = RpcClient::new(&alchemy_url)
            .get_block_by_number(BlockSpec::Number(block_number), true)
            .await
            .expect("should have succeeded");

        assert_eq!(block.number, Some(block_number));
        assert_eq!(block.transactions.len(), 102);
    }

    #[test_with::env(ALCHEMY_URL)]
    #[tokio::test]
    async fn get_storage_at_with_block_success() {
        let alchemy_url = get_alchemy_url();

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        let total_supply: U256 = RpcClient::new(&alchemy_url)
            .get_storage_at(
                &dai_address,
                U256::from_str_radix(
                    "0000000000000000000000000000000000000000000000000000000000000001",
                    16,
                )
                .expect("failed to parse storage location"),
                BlockSpec::Number(U256::from(16220843)),
            )
            .await
            .expect("should have succeeded");

        assert_eq!(
            total_supply,
            U256::from_str_radix(
                "000000000000000000000000000000000000000010a596ae049e066d4991945c",
                16
            )
            .expect("failed to parse storage location")
        );
    }

    #[test_with::env(ALCHEMY_URL)]
    #[tokio::test]
    async fn get_storage_at_success() {
        let alchemy_url = get_alchemy_url();

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        let total_supply: U256 = RpcClient::new(&alchemy_url)
            .get_storage_at(
                &dai_address,
                U256::from_str_radix(
                    "0000000000000000000000000000000000000000000000000000000000000001",
                    16,
                )
                .expect("failed to parse storage location"),
                BlockSpec::Tag("latest".to_string()),
            )
            .await
            .expect("should have succeeded");

        assert!(total_supply > U256::from(0));
    }

    #[test_with::env(ALCHEMY_URL)]
    #[tokio::test]
    async fn get_transaction_count_success() {
        let alchemy_url = get_alchemy_url();

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        let transaction_count = RpcClient::new(&alchemy_url)
            .get_transaction_count(&dai_address, BlockSpec::Number(U256::from(16220843)))
            .await
            .expect("should have succeeded");

        assert_eq!(transaction_count, U256::from(1));
    }

    #[test_with::env(ALCHEMY_URL)]
    #[tokio::test]
    async fn get_account_info_with_block_success() {
        let alchemy_url = get_alchemy_url();

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        let account_info = RpcClient::new(&alchemy_url)
            .get_account_info(&dai_address, BlockSpec::Number(U256::from(16220843)))
            .await
            .expect("should have succeeded");

        assert_eq!(account_info.balance, U256::from(0));
        assert_eq!(account_info.nonce, 1);
    }

    #[test_with::env(ALCHEMY_URL)]
    #[tokio::test]
    async fn get_account_info_success() {
        let alchemy_url = get_alchemy_url();

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        let account_info = RpcClient::new(&alchemy_url)
            .get_account_info(&dai_address, BlockSpec::Tag("latest".to_string()))
            .await
            .expect("should have succeeded");

        assert_eq!(account_info.balance, U256::from(0));
        assert_eq!(account_info.nonce, 1);
    }
}
