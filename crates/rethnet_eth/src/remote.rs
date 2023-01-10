#![cfg(feature = "serde")]

use std::sync::atomic::{AtomicU64, Ordering};

use crate::{Address, Bytes, B256, U256};

mod eth;
mod jsonrpc;

// provide interfaces for all of the client functionality depended on by the existing Hardhat
// Network logic, specifically
// packages/hardhat-core/src/internal/hardhat-network/provider/fork/{ForkBlockchain,
// ForkStateManager}.ts
// and even more specifically, all of the methods shown in these excerpts:
//
//      const remote = await this._jsonRpcClient.getTransactionByHash(
//    const remote = await this._jsonRpcClient.getTransactionReceipt(
//      const remoteLogs = await this._jsonRpcClient.getLogs({
//    const rpcBlock = await this._jsonRpcClient.getBlockByHash(blockHash, true);
//    const rpcBlock = await this._jsonRpcClient.getBlockByNumber(
//      const noncePromise = this._jsonRpcClient.getTransactionCount(
//      const accountData = await this._jsonRpcClient.getAccountData(
//    const remoteValue = await this._jsonRpcClient.getStorageAt(

/// Specialzed error types
#[derive(thiserror::Error, Debug)]
pub enum RpcClientError {
    /// The remote node's response did not conform to the expected format
    #[error("Response was not of the expected type")]
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
    #[error("Failed to send request")]
    SendError {
        /// The error message
        msg: String,
        /// The body of the request that was submitted
        request_body: String,
    },

    /// The remote node failed to reply with the body of the response
    #[error("Failed to get response body")]
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

/// the output of get_account_data
pub struct AccountData {
    /// The account's balance
    pub balance: U256,
    /// The code stored at the account address
    pub code: Bytes,
    /// The count of this account's previous transactions, aka nonce
    pub transaction_count: U256,
}

/// A client for executing RPC methods on a remote Ethereum node
pub struct RpcClient {
    url: String,
    client: reqwest::Client,
    next_id: AtomicU64,
}

#[allow(clippy::enum_variant_names)]
enum MethodInvocation {
    GetTxByHash(B256),
    GetTxReceipt(B256),
    GetLogs {
        from_block: u64,
        to_block: u64,
        address: Address,
    },
    GetBalance {
        address: Address,
        block_number: u64,
    },
    GetBlockByHash {
        hash: B256,
        include_transactions: bool,
    },
    GetBlockByNumber {
        number: u64,
        include_transactions: bool,
    },
    GetCode {
        address: Address,
        block_number: u64,
    },
    GetTxCount {
        address: Address,
        block_number: u64,
    },
}

struct SingleRequest {
    json: String,
    id: jsonrpc::Id,
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

impl RpcClient {
    fn form_request(&self, input: &MethodInvocation) -> SingleRequest {
        let (method, params_json) = match input {
            MethodInvocation::GetBlockByHash {
                hash,
                include_transactions,
            } => (
                "eth_getBlockByHash",
                format!(
                    "{},{}",
                    serde_json::json!(hash),
                    serde_json::json!(include_transactions),
                ),
            ),
            MethodInvocation::GetBlockByNumber {
                number,
                include_transactions,
            } => (
                "eth_getBlockByNumber",
                format!(
                    "\"{:#x}\",{}",
                    number,
                    serde_json::json!(include_transactions),
                ),
            ),
            MethodInvocation::GetLogs {
                from_block,
                to_block,
                address,
            } => (
                "eth_getLogs",
                format!(
                    "{{
                        \"fromBlock\":\"{:#x}\",
                        \"toBlock\":\"{:#x}\",
                        \"address\":{}
                    }}",
                    from_block,
                    to_block,
                    serde_json::json!(address)
                ),
            ),
            MethodInvocation::GetTxByHash(hash) => (
                "eth_getTransactionByHash",
                format!("{}", serde_json::json!(hash)),
            ),
            MethodInvocation::GetTxCount {
                address,
                block_number,
            } => (
                "eth_getTransactionCount",
                format!("{},\"{:#x}\"", serde_json::json!(address), block_number),
            ),
            MethodInvocation::GetTxReceipt(tx_hash) => (
                "eth_getTransactionReceipt",
                format!("{}", serde_json::json!(tx_hash)),
            ),
            MethodInvocation::GetBalance {
                address,
                block_number,
            } => (
                "eth_getBalance",
                format!("{},\"{:#x}\"", serde_json::json!(address), block_number),
            ),
            MethodInvocation::GetCode {
                address,
                block_number,
            } => (
                "eth_getCode",
                format!("{},\"{:#x}\"", serde_json::json!(address), block_number),
            ),
        };

        let id = jsonrpc::Id::Num(self.next_id.fetch_add(1, Ordering::Relaxed));
        let json = format!(
            "{{
                    \"jsonrpc\":\"2.0\",
                    \"method\":\"{}\",
                    \"params\":[{}],
                    \"id\":{}
                }}",
            method,
            params_json,
            serde_json::json!(id)
        );
        SingleRequest { json, id }
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

    async fn call(&self, input: &MethodInvocation) -> Result<Response, RpcClientError> {
        let SingleRequest { json, id } = self.form_request(input);
        let response_text = self.send_request_body(json.clone()).await?;
        Ok(Response {
            request_id: id,
            request_body: json.clone(),
            text: response_text,
        })
    }

    async fn batch_call(
        &self,
        inputs: &[MethodInvocation],
    ) -> Result<BatchResponse, RpcClientError> {
        let requests: Vec<SingleRequest> = inputs.iter().map(|i| self.form_request(i)).collect();

        let request_body = format!(
            "[{}]",
            requests
                .iter()
                .map(|r| { r.json.clone() })
                .collect::<Vec<String>>()
                .join(",")
        );

        let response_text = self.send_request_body(request_body.clone()).await?;

        Ok(BatchResponse {
            request_body: request_body.clone(),
            request_ids: requests.into_iter().map(|r| r.id).collect(),
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
        let response = self.call(&MethodInvocation::GetTxByHash(*tx_hash)).await?;

        let success: jsonrpc::Success<eth::Transaction> = serde_json::from_str(&response.text)
            .map_err(|err| RpcClientError::InterpretationError {
                msg: err.to_string(),
                request_body: response.request_body,
                expected_type: String::from("jsonrpc::Success<eth::Transaction>"),
                response_text: response.text,
            })?;

        assert_eq!(success.id, response.request_id);

        Ok(success.result)
    }

    /// eth_getTransactionReceipt
    pub async fn get_tx_receipt(
        &self,
        tx_hash: &B256,
    ) -> Result<eth::TransactionReceipt, RpcClientError> {
        let response = self.call(&MethodInvocation::GetTxReceipt(*tx_hash)).await?;

        let success: jsonrpc::Success<eth::TransactionReceipt> =
            serde_json::from_str(&response.text).map_err(|err| {
                RpcClientError::InterpretationError {
                    msg: err.to_string(),
                    request_body: response.request_body,
                    expected_type: String::from("jsonrpc::Success<eth::TransactionReceipt>"),
                    response_text: response.text,
                }
            })?;

        assert_eq!(success.id, response.request_id);

        Ok(success.result)
    }

    /// eth_getLogs
    pub async fn get_logs(
        &self,
        from_block: u64,
        to_block: u64,
        address: &Address,
    ) -> Result<Vec<eth::Log>, RpcClientError> {
        let response = self
            .call(&MethodInvocation::GetLogs {
                from_block,
                to_block,
                address: *address,
            })
            .await?;

        let success: jsonrpc::Success<Vec<eth::Log>> = serde_json::from_str(&response.text)
            .map_err(|err| RpcClientError::InterpretationError {
                msg: err.to_string(),
                request_body: response.request_body.clone(),
                expected_type: String::from("jsonrpc::Success<Vec<eth::Log>>"),
                response_text: response.text,
            })?;

        assert_eq!(success.id, response.request_id);

        Ok(success.result)
    }

    /// eth_getBlockByHash
    pub async fn get_block_by_hash(
        &self,
        hash: &B256,
        include_transactions: bool,
    ) -> Result<eth::Block<eth::Transaction>, RpcClientError> {
        let response = self
            .call(&MethodInvocation::GetBlockByHash {
                hash: *hash,
                include_transactions,
            })
            .await?;

        let success: jsonrpc::Success<eth::Block<eth::Transaction>> =
            serde_json::from_str(&response.text).map_err(|err| {
                RpcClientError::InterpretationError {
                    msg: err.to_string(),
                    request_body: response.request_body.clone(),
                    expected_type: String::from("jsonrpc::Success<eth::Block<eth::Transaction>>"),
                    response_text: response.text,
                }
            })?;

        assert_eq!(success.id, response.request_id);

        Ok(success.result)
    }

    /// eth_getBlockByNumber
    pub async fn get_block_by_number(
        &self,
        number: u64,
        include_transactions: bool,
    ) -> Result<eth::Block<eth::Transaction>, RpcClientError> {
        let response = self
            .call(&MethodInvocation::GetBlockByNumber {
                number,
                include_transactions,
            })
            .await?;

        let success: jsonrpc::Success<eth::Block<eth::Transaction>> =
            serde_json::from_str(&response.text).map_err(|err| {
                RpcClientError::InterpretationError {
                    msg: err.to_string(),
                    request_body: response.request_body.clone(),
                    expected_type: String::from("jsonrpc::Success<eth::Block<eth::Transaction>>"),
                    response_text: response.text,
                }
            })?;

        assert_eq!(success.id, response.request_id);

        Ok(success.result)
    }

    /// eth_getTransactionCount
    pub async fn get_transaction_count(
        &self,
        address: &Address,
        block_number: u64,
    ) -> Result<U256, RpcClientError> {
        let response = self
            .call(&MethodInvocation::GetTxCount {
                address: *address,
                block_number,
            })
            .await?;

        let success: jsonrpc::Success<U256> =
            serde_json::from_str(&response.text).map_err(|err| {
                RpcClientError::InterpretationError {
                    msg: err.to_string(),
                    request_body: response.request_body.clone(),
                    expected_type: String::from("jsonrpc::Success<U256>"),
                    response_text: response.text,
                }
            })?;

        assert_eq!(success.id, response.request_id);

        Ok(success.result)
    }

    /// Submit a consolidated batch of RPC method invocations in order to obtain the set of data
    /// contained in AccountData.
    pub async fn get_account_data(
        &self,
        address: &Address,
        block_number: u64,
    ) -> Result<AccountData, RpcClientError> {
        let inputs = Vec::from([
            MethodInvocation::GetBalance {
                address: *address,
                block_number,
            },
            MethodInvocation::GetCode {
                address: *address,
                block_number,
            },
            MethodInvocation::GetTxCount {
                address: *address,
                block_number,
            },
        ]);

        let response = self.batch_call(&inputs).await?;

        let results: (
            jsonrpc::Success<U256>,
            jsonrpc::Success<Bytes>,
            jsonrpc::Success<U256>,
        ) = serde_json::from_str(&response.text).map_err(|err| {
            RpcClientError::InterpretationError {
                msg: err.to_string(),
                request_body: response.request_body.clone(),
                expected_type: String::from("Array"),
                response_text: response.text.clone(),
            }
        })?;

        assert_eq!(results.0.id, response.request_ids[0]);
        assert_eq!(results.1.id, response.request_ids[1]);
        assert_eq!(results.2.id, response.request_ids[2]);

        Ok(AccountData {
            balance: results.0.result,
            code: results.1.result,
            transaction_count: results.2.result,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use std::str::FromStr;

    use crate::{Address, Bytes, U256};

    fn get_alchemy_url() -> Result<String, String> {
        Ok(std::env::var_os("ALCHEMY_URL")
            .expect("ALCHEMY_URL environment variable not defined")
            .into_string()
            .expect("couldn't convert OsString into a String"))
    }

    #[tokio::test]
    async fn get_tx_by_hash_success() {
        use std::str::FromStr;

        let alchemy_url = get_alchemy_url().expect("failed to get Alchemy URL");

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
            Some(u64::from_str_radix("a74fde", 16).expect("couldn't parse data"))
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
        assert!(error_string.contains("Success<eth::Transaction>"));
        assert!(error_string.contains("Must be authenticated!"));
    }

    #[tokio::test]
    async fn get_tx_receipt_success() {
        let alchemy_url = get_alchemy_url().expect("failed to get Alchemy URL");

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
            Some(u64::from_str_radix("a74fde", 16).expect("couldn't parse data"))
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
        assert!(error_string.contains("Success<eth::TransactionReceipt>"));
        assert!(error_string.contains("Must be authenticated!"));
    }

    #[tokio::test]
    async fn get_logs_success() {
        let alchemy_url = get_alchemy_url().expect("failed to get Alchemy URL");
        let logs = RpcClient::new(&alchemy_url)
            .get_logs(
                10496585,
                10496585,
                &Address::from_str("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
                    .expect("failed to parse data"),
            )
            .await
            .expect("failed to get logs");
        assert_eq!(logs.len(), 12);
        // TODO: assert more things about the log(s)
        // TODO: consider asserting something about the logs bloom
    }

    #[tokio::test]
    async fn get_block_by_hash_success() {
        let alchemy_url = get_alchemy_url().expect("failed to get Alchemy URL");

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

    #[tokio::test]
    async fn get_block_by_number_success() {
        let alchemy_url = get_alchemy_url().expect("failed to get Alchemy URL");

        let block_number = 16222385;

        let block = RpcClient::new(&alchemy_url)
            .get_block_by_number(block_number, true)
            .await
            .expect("should have succeeded");

        assert_eq!(block.number, Some(block_number));
        assert_eq!(block.transactions.len(), 102);
    }

    #[tokio::test]
    async fn get_transaction_count_success() {
        let alchemy_url = get_alchemy_url().expect("failed to get Alchemy URL");

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        let transaction_count = RpcClient::new(&alchemy_url)
            .get_transaction_count(&dai_address, 16220843)
            .await
            .expect("should have succeeded");

        assert_eq!(transaction_count, U256::from(1));
    }

    #[tokio::test]
    async fn get_account_data_success() {
        let alchemy_url = get_alchemy_url().expect("failed to get Alchemy URL");

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        let account_data = RpcClient::new(&alchemy_url)
            .get_account_data(&dai_address, 16220843)
            .await
            .expect("should have succeeded");

        assert_eq!(account_data.balance, U256::from(0));
        assert_eq!(
            account_data.code,
            String::from(include_str!("test_bytecode.in")).trim_end()
        );
        assert_eq!(account_data.transaction_count, U256::from(1));
    }
}
