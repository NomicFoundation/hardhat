use std::sync::atomic::{AtomicU64, Ordering};

use revm_primitives::AccountInfo;

use crate::{Address, B256, U256};

mod eth;
mod jsonrpc;

/// Specialized error types
#[derive(thiserror::Error, Debug)]
pub enum RpcClientError {
    /// The remote node's response did not conform to the expected format
    #[error("Response was not of the expected type ({expected_type}). {msg}. Request body was {request_body}. Response text was {response_text}")]
    InterpretationError {
        /// A more specific message
        msg: String,
        /// The body of the request that was submitted to elicit the response
        request_body: String,
        /// The Rust type which was expected to be decoded from the JSON received
        expected_type: String,
        /// The body of the response given by the remote node
        response_text: String,
    },

    /// The message could not be sent to the remote node
    #[error("Failed to send request. {msg}. Request body was {request_body}.")]
    SendError {
        /// The error message
        msg: String,
        /// The body of the request that was submitted
        request_body: String,
    },

    /// The remote node failed to reply with the body of the response
    #[error("Failed to get response body. {msg}. Request body was {request_body}.")]
    ResponseError {
        /// The specific error message
        msg: String,
        /// The body of the request that was submitted
        request_body: String,
    },

    /// Some other error from an underlying dependency
    #[error(transparent)]
    OtherError(#[from] std::io::Error),
}

/// A client for executing RPC methods on a remote Ethereum node
pub struct RpcClient {
    url: String,
    client: reqwest::Client,
    next_id: AtomicU64,
}

struct U64(u64);
impl serde::Serialize for U64 {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&format!("{:#x}", self.0))
    }
}

impl From<u64> for U64 {
    fn from(u: u64) -> U64 {
        U64(u)
    }
}

fn single_to_sequence<S, T>(val: &T, s: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
    T: serde::Serialize,
{
    use serde::ser::SerializeSeq;
    let mut seq = s.serialize_seq(Some(1))?;
    seq.serialize_element(val)?;
    seq.end()
}

/// a custom implementation because the one from ruint includes leading zeroes and the JSON-RPC
/// server implementations reject that.
fn serialize_u256<S>(x: &U256, s: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    let bytes = x.to_be_bytes_vec();
    let mut result = String::with_capacity(2 * U256::BYTES + 2);
    result.push_str("0x");
    let mut found_nonzero = false;
    for byte in bytes {
        if found_nonzero || byte != 0 {
            let formatted_byte = format!("{:02x}", byte);
            let mut nibbles = formatted_byte.chars();

            let first_nibble = nibbles.next().unwrap();
            if found_nonzero || first_nibble != char::from_digit(0, 10).unwrap() {
                result.push(first_nibble);
            }

            let second_nibble = nibbles.next().unwrap();
            result.push(second_nibble);

            found_nonzero = true;
        }
    }
    s.serialize_str(&result)
}

/// For specifying a block
#[derive(Clone)]
pub enum BlockSpec {
    /// as a block number
    Number(U256),
    /// as a block tag (eg "latest")
    Tag(String),
}

#[derive(serde::Serialize)]
#[serde(untagged)]
enum SerializableBlockSpec {
    /// as a block number
    #[serde(serialize_with = "serialize_u256")]
    Number(U256),
    /// as a block tag (eg "latest")
    Tag(String),
}

impl From<BlockSpec> for SerializableBlockSpec {
    fn from(block_spec: BlockSpec) -> SerializableBlockSpec {
        match block_spec {
            BlockSpec::Number(n) => SerializableBlockSpec::Number(U256::from(n)),
            BlockSpec::Tag(s) => SerializableBlockSpec::Tag(s),
        }
    }
}

#[derive(serde::Serialize)]
#[serde(tag = "method", content = "params")]
enum MethodInvocation {
    #[serde(rename = "eth_getStorageAt")]
    StorageAt(
        Address,
        /// position
        U256,
        SerializableBlockSpec,
    ),
    #[serde(
        rename = "eth_getTransactionByHash",
        serialize_with = "single_to_sequence"
    )]
    TxByHash(B256),
    #[serde(
        rename = "eth_getTransactionReceipt",
        serialize_with = "single_to_sequence"
    )]
    TxReceipt(B256),
    #[serde(rename = "eth_getLogs", serialize_with = "single_to_sequence")]
    Logs(GetLogsInput),
    #[serde(rename = "eth_getBalance")]
    Balance(Address, SerializableBlockSpec),
    #[serde(rename = "eth_getBlockByHash")]
    BlockByHash(
        /// hash
        B256,
        /// include transactions
        bool,
    ),
    #[serde(rename = "eth_getBlockByNumber")]
    Block(
        SerializableBlockSpec,
        /// include transactions
        bool,
    ),
    #[serde(rename = "eth_getCode")]
    Code(Address, SerializableBlockSpec),
    #[serde(rename = "eth_getTransactionCount")]
    TxCount(Address, SerializableBlockSpec),
}

struct Response {
    text: String,
    request_body: String,
    request_id: jsonrpc::Id,
}

struct BatchResponse {
    text: String,
    request_body: String,
    request_ids: Vec<jsonrpc::Id>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct GetLogsInput {
    from_block: SerializableBlockSpec,
    to_block: SerializableBlockSpec,
    address: Address,
}

#[derive(serde::Serialize)]
struct Request<'a> {
    version: jsonrpc::Version,
    #[serde(flatten)]
    method: &'a MethodInvocation,
    id: jsonrpc::Id,
}

impl RpcClient {
    fn verify_success<T>(response: Response) -> Result<T, RpcClientError>
    where
        T: for<'a> serde::Deserialize<'a>,
    {
        let response_text = response.text.clone();
        let success: jsonrpc::Success<T> = serde_json::from_str(&response.text).map_err(|err| {
            RpcClientError::InterpretationError {
                msg: err.to_string(),
                request_body: response.request_body,
                expected_type: format!(
                    "rethnet_eth::remote::jsonrpc::Success<{}>",
                    std::any::type_name::<T>()
                ),
                response_text,
            }
        })?;

        assert_eq!(success.id, response.request_id);

        Ok(success.result)
    }

    /// returns response text
    async fn send_request_body(&self, request_body: String) -> Result<String, RpcClientError> {
        use RpcClientError::{ResponseError, SendError};
        self.client
            .post(self.url.to_string())
            .body(request_body.to_string())
            .send()
            .await
            .map_err(|err| SendError {
                msg: err.to_string(),
                request_body: request_body.to_string(),
            })?
            .text()
            .await
            .map_err(|err| ResponseError {
                msg: err.to_string(),
                request_body: request_body.to_string(),
            })
    }

    async fn call<T>(&self, input: &MethodInvocation) -> Result<T, RpcClientError>
    where
        T: for<'a> serde::Deserialize<'a>,
    {
        let id = jsonrpc::Id::Num(self.next_id.fetch_add(1, Ordering::Relaxed));
        let json = serde_json::json!(Request {
            version: crate::remote::jsonrpc::Version::V2_0,
            id: id.clone(),
            method: input,
        })
        .to_string();

        Self::verify_success(Response {
            request_id: id,
            request_body: json.clone(),
            text: self.send_request_body(json).await?,
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
                    id: id.clone(),
                    method: i,
                })
                .to_string();
                (json, id)
            })
            .unzip();

        let request_body = format!("[{}]", request_strings.join(","));

        let response_text = self.send_request_body(request_body.clone()).await?;

        Ok(BatchResponse {
            request_body,
            request_ids,
            text: response_text,
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
            MethodInvocation::Code(*address, block.clone().into()),
            MethodInvocation::TxCount(*address, block.into()),
        ]);

        let response = self.batch_call(&inputs).await?;

        let results: (
            jsonrpc::Success<U256>,
            jsonrpc::Success<jsonrpc::ZeroXPrefixedBytes>,
            jsonrpc::Success<U256>,
        ) = serde_json::from_str(&response.text).map_err(|err| {
            RpcClientError::InterpretationError {
                msg: err.to_string(),
                request_body: response.request_body.clone(),
                expected_type: String::from("Array of success results"),
                response_text: response.text.clone(),
            }
        })?;

        assert_eq!(results.0.id, response.request_ids[0]);
        assert_eq!(results.1.id, response.request_ids[1]);
        assert_eq!(results.2.id, response.request_ids[2]);

        let code = revm_primitives::Bytecode::new_raw(results.1.result.bytes);

        Ok(AccountInfo {
            balance: results.0.result,
            code: Some(code.clone()),
            code_hash: code.hash(),
            nonce: results.2.result.to(),
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
        let alchemy_url = "https://xxxeth-mainnet.g.alchemy.com";

        let hash =
            B256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a")
                .expect("failed to parse hash from string");

        let error_string = format!(
            "{:?}",
            RpcClient::new(alchemy_url)
                .get_tx_by_hash(&hash)
                .await
                .expect_err("should have failed to connect to a garbage domain name")
        );

        assert!(error_string.contains("SendError"));
        assert!(error_string.contains("dns error"));
    }

    #[test_with::env(ALCHEMY_URL)]
    #[tokio::test]
    async fn get_tx_by_hash_bad_api_key() {
        let alchemy_url = "https://eth-mainnet.g.alchemy.com/v2/abcdefg";

        let hash =
            B256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a")
                .expect("failed to parse hash from string");

        let error_string = format!(
            "{:?}",
            RpcClient::new(alchemy_url)
                .get_tx_by_hash(&hash)
                .await
                .expect_err("should have failed to interpret response as a Transaction")
        );

        assert!(error_string.contains("InterpretationError"));
        assert!(error_string.contains("Success<rethnet_eth::remote::eth::Transaction>"));
        assert!(error_string.contains("Must be authenticated!"));
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
        let alchemy_url = "https://xxxeth-mainnet.g.alchemy.com";

        let hash =
            B256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a")
                .expect("failed to parse hash from string");

        let error_string = format!(
            "{:?}",
            RpcClient::new(alchemy_url)
                .get_tx_receipt(&hash)
                .await
                .expect_err("should have failed to connect to a garbage domain name")
        );

        assert!(error_string.contains("SendError"));
        assert!(error_string.contains("dns error"));
    }

    #[test_with::env(ALCHEMY_URL)]
    #[tokio::test]
    async fn get_tx_receipt_bad_api_key() {
        let alchemy_url = "https://eth-mainnet.g.alchemy.com/v2/abcdefg";

        let hash =
            B256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a")
                .expect("failed to parse hash from string");

        let error_string = format!(
            "{:?}",
            RpcClient::new(alchemy_url)
                .get_tx_receipt(&hash)
                .await
                .expect_err("should have failed to interpret response as a Receipt")
        );

        assert!(error_string.contains("InterpretationError"));
        assert!(error_string.contains("Success<rethnet_eth::remote::eth::TransactionReceipt>"));
        assert!(error_string.contains("Must be authenticated!"));
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
