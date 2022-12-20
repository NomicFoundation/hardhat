use rethnet_eth::{Address, Bytes, H256, U256};

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

mod jsonrpc {
    // adapted from https://github.com/koushiro/async-jsonrpc

    use serde::{Deserialize, Serialize};

    /// Represents JSON-RPC 2.0 success response.
    #[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
    #[serde(deny_unknown_fields)]
    pub struct Success<T = serde_json::Value> {
        /// A String specifying the version of the JSON-RPC protocol.
        pub jsonrpc: Version,
        /// Successful execution result.
        pub result: T,
        /// Correlation id.
        ///
        /// It **MUST** be the same as the value of the id member in the Request Object.
        pub id: Id,
    }

    /// Represents JSON-RPC request/response id.
    ///
    /// An identifier established by the Client that MUST contain a String, Number,
    /// or NULL value if included, If it is not included it is assumed to be a notification.
    /// The value SHOULD normally not be Null and Numbers SHOULD NOT contain fractional parts.
    ///
    /// The Server **MUST** reply with the same value in the Response object if included.
    /// This member is used to correlate the context between the two objects.
    #[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Hash, Serialize, Deserialize)]
    #[serde(deny_unknown_fields)]
    #[serde(untagged)]
    pub enum Id {
        /// Numeric id
        Num(u64),
        /// String id
        Str(String),
    }
    /// Represents JSON-RPC protocol version.
    #[derive(Copy, Clone, Debug, Eq, PartialEq, Hash)]
    pub enum Version {
        /// Represents JSON-RPC 2.0 version.
        V2_0,
    }

    impl Serialize for Version {
        fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
        where
            S: serde::Serializer,
        {
            match self {
                Version::V2_0 => serializer.serialize_str("2.0"),
            }
        }
    }

    impl<'a> Deserialize<'a> for Version {
        fn deserialize<D>(deserializer: D) -> Result<Version, D::Error>
        where
            D: serde::Deserializer<'a>,
        {
            deserializer.deserialize_identifier(VersionVisitor)
        }
    }

    struct VersionVisitor;
    impl<'a> serde::de::Visitor<'a> for VersionVisitor {
        type Value = Version;

        fn expecting(&self, formatter: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
            formatter.write_str("a string")
        }

        fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            match value {
                "2.0" => Ok(Version::V2_0),
                _ => Err(serde::de::Error::custom(
                    "Invalid JSON-RPC protocol version",
                )),
            }
        }
    }
}

mod eth {
    // adapted from github.com/gakonst/ethers-rs

    use rethnet_eth::{Address, Bloom, Bytes, H256, U256};

    #[derive(Clone, Debug, PartialEq, Eq, Default, serde::Deserialize, serde::Serialize)]
    #[serde(deny_unknown_fields)]
    #[serde(rename_all = "camelCase")]
    pub struct AccessListEntry {
        address: Address,
        storage_keys: Vec<U256>,
    }

    #[derive(Clone, Debug, PartialEq, Eq, Default, serde::Deserialize, serde::Serialize)]
    #[serde(deny_unknown_fields)]
    #[serde(rename_all = "camelCase")]
    pub struct Transaction {
        /// The transaction's hash
        pub hash: H256,
        pub nonce: U256,
        pub block_hash: Option<H256>,
        #[serde(deserialize_with = "optional_u64_from_hex")]
        pub block_number: Option<u64>,
        #[serde(deserialize_with = "optional_u64_from_hex")]
        pub transaction_index: Option<u64>,
        pub from: Address,
        pub to: Option<Address>,
        pub value: U256,
        pub gas_price: Option<U256>,
        pub gas: U256,
        pub input: Bytes,
        #[serde(deserialize_with = "u64_from_hex")]
        pub v: u64,
        pub r: U256,
        pub s: U256,
        #[serde(default, deserialize_with = "optional_u64_from_hex")]
        pub chain_id: Option<u64>,
        #[serde(
            rename = "type",
            default,
            skip_serializing_if = "Option::is_none",
            deserialize_with = "optional_u64_from_hex"
        )]
        pub transaction_type: Option<u64>,
        #[serde(default)]
        pub access_list: Option<Vec<AccessListEntry>>,
        #[serde(default)]
        pub max_fee_per_gas: Option<U256>,
        #[serde(default)]
        pub max_priority_fee_per_gas: Option<U256>,
    }

    fn optional_u64_from_hex<'de, D>(deserializer: D) -> Result<Option<u64>, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s: &str = serde::Deserialize::deserialize(deserializer)?;
        Ok(Some(
            u64::from_str_radix(&s[2..], 16).expect("failed to parse u64"),
        ))
    }

    fn u64_from_hex<'de, D>(deserializer: D) -> Result<u64, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s: &str = serde::Deserialize::deserialize(deserializer)?;
        Ok(u64::from_str_radix(&s[2..], 16).expect("failed to parse u64"))
    }

    #[derive(Debug, Clone, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
    #[serde(deny_unknown_fields)]
    #[serde(rename_all = "camelCase")]
    pub struct Log {
        pub address: Address,
        pub topics: Vec<H256>,
        pub data: Bytes,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub block_hash: Option<H256>,
        #[serde(
            skip_serializing_if = "Option::is_none",
            deserialize_with = "optional_u64_from_hex"
        )]
        pub block_number: Option<u64>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub transaction_hash: Option<H256>,
        #[serde(
            skip_serializing_if = "Option::is_none",
            deserialize_with = "optional_u64_from_hex"
        )]
        pub transaction_index: Option<u64>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub log_index: Option<U256>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub transaction_log_index: Option<U256>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub log_type: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub removed: Option<bool>,
    }

    #[derive(Clone, Debug, PartialEq, Eq, Default, serde::Deserialize, serde::Serialize)]
    #[serde(deny_unknown_fields)]
    #[serde(rename_all = "camelCase")]
    pub struct TransactionReceipt {
        pub block_hash: Option<H256>,
        #[serde(deserialize_with = "optional_u64_from_hex")]
        pub block_number: Option<u64>,
        pub contract_address: Option<Address>,
        pub cumulative_gas_used: U256,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        pub effective_gas_price: Option<U256>,
        pub from: Address,
        pub gas_used: Option<U256>,
        pub logs: Vec<Log>,
        pub logs_bloom: Bloom,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        pub root: Option<H256>,
        #[serde(deserialize_with = "optional_u64_from_hex")]
        pub status: Option<u64>,
        pub to: Option<Address>,
        pub transaction_hash: H256,
        #[serde(deserialize_with = "u64_from_hex")]
        pub transaction_index: u64,
        #[serde(
            rename = "type",
            default,
            skip_serializing_if = "Option::is_none",
            deserialize_with = "optional_u64_from_hex"
        )]
        pub transaction_type: Option<u64>,
    }

    #[derive(Debug, Default, Clone, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
    #[serde(deny_unknown_fields)]
    #[serde(rename_all = "camelCase")]
    pub struct Block<TX> {
        pub hash: Option<H256>,
        pub parent_hash: H256,
        pub sha3_uncles: H256,
        pub author: Option<Address>,
        pub state_root: H256,
        pub transactions_root: H256,
        pub receipts_root: H256,
        #[serde(deserialize_with = "optional_u64_from_hex")]
        pub number: Option<u64>,
        pub gas_used: U256,
        pub gas_limit: U256,
        pub extra_data: Bytes,
        pub logs_bloom: Option<Bloom>,
        #[serde(default)]
        pub timestamp: U256,
        #[serde(default)]
        pub difficulty: U256,
        pub total_difficulty: Option<U256>,
        #[serde(default, deserialize_with = "deserialize_null_default")]
        pub seal_fields: Vec<Bytes>,
        #[serde(default)]
        pub uncles: Vec<H256>,
        #[serde(bound = "TX: serde::Serialize + serde::de::DeserializeOwned", default)]
        pub transactions: Vec<TX>,
        pub size: Option<U256>,
        pub mix_hash: Option<H256>,
        pub nonce: Option<U256>,
        pub base_fee_per_gas: Option<U256>,
        pub miner: Address,
    }

    fn deserialize_null_default<'de, D, T>(deserializer: D) -> Result<T, D::Error>
    where
        T: Default + serde::Deserialize<'de>,
        D: serde::Deserializer<'de>,
    {
        use serde::Deserialize;
        let opt = Option::deserialize(deserializer)?;
        Ok(opt.unwrap_or_default())
    }
}

#[derive(thiserror::Error, Debug)]
pub enum RpcClientError {
    #[error("Response was not of the expected type")]
    InterpretationError {
        msg: String,
        request_body: String,
        expected_type: String,
        response_text: String,
    },

    #[error("Failed to send request")]
    SendError { msg: String, request_body: String },

    #[error("Failed to get response body")]
    ResponseError { msg: String, request_body: String },

    #[error(transparent)]
    OtherError(#[from] std::io::Error),
}

pub struct AccountData {
    pub balance: U256,
    pub code: Bytes,
    pub transaction_count: U256,
}

pub struct RpcClient {
    url: String,
    client: reqwest::blocking::Client,
}

impl RpcClient {
    pub fn new(url: &str) -> Self {
        RpcClient {
            url: url.to_string(),
            client: reqwest::blocking::Client::new(),
        }
    }

    fn make_id() -> Result<u64, std::time::SystemTimeError> {
        use std::time::{SystemTime, UNIX_EPOCH};
        let since_epoch = SystemTime::now().duration_since(UNIX_EPOCH)?;
        Ok(since_epoch
            .as_secs()
            .wrapping_sub(since_epoch.subsec_nanos() as u64))
    }

    pub fn get_tx_by_hash(&self, tx_hash: &H256) -> Result<eth::Transaction, RpcClientError> {
        use RpcClientError::{InterpretationError, ResponseError, SendError};

        let request_id =
            jsonrpc::Id::Num(RpcClient::make_id().expect("error generating request ID"));

        let request_body: String = format!(
            "{{
                \"jsonrpc\":\"2.0\",
                \"method\":\"eth_getTransactionByHash\",
                \"params\":[{}],
                \"id\":{}
            }}",
            serde_json::json!(tx_hash),
            serde_json::json!(request_id)
        );

        let response_text = self
            .client
            .post(self.url.to_string())
            .body(request_body.clone())
            .send()
            .map_err(|err| SendError {
                msg: err.to_string(),
                request_body: request_body.clone(),
            })?
            .text()
            .map_err(|err| ResponseError {
                msg: err.to_string(),
                request_body: request_body.clone(),
            })?;

        let success: jsonrpc::Success<eth::Transaction> = serde_json::from_str(&response_text)
            .map_err(|err| InterpretationError {
                msg: err.to_string(),
                request_body,
                expected_type: String::from("jsonrpc::Success<eth::Transaction>"),
                response_text,
            })?;

        assert_eq!(success.id, request_id);

        Ok(success.result)
    }

    pub fn get_tx_receipt(
        &self,
        tx_hash: &H256,
    ) -> Result<eth::TransactionReceipt, RpcClientError> {
        use RpcClientError::{InterpretationError, ResponseError, SendError};

        let request_id =
            jsonrpc::Id::Num(RpcClient::make_id().expect("error generating request ID"));

        let request_body = format!(
            "{{
                \"jsonrpc\":\"2.0\",
                \"method\":\"eth_getTransactionReceipt\",
                \"params\":[{}],
                \"id\":{}
            }}",
            serde_json::json!(tx_hash),
            serde_json::json!(request_id)
        );

        let response_text = self
            .client
            .post(self.url.to_string())
            .body(request_body.clone())
            .send()
            .map_err(|err| SendError {
                msg: err.to_string(),
                request_body: request_body.clone(),
            })?
            .text()
            .map_err(|err| ResponseError {
                msg: err.to_string(),
                request_body: request_body.clone(),
            })?;

        let success: jsonrpc::Success<eth::TransactionReceipt> =
            serde_json::from_str(&response_text).map_err(|err| InterpretationError {
                msg: err.to_string(),
                request_body: request_body.clone(),
                expected_type: String::from("jsonrpc::Success<eth::TransactionReceipt>"),
                response_text,
            })?;

        assert_eq!(success.id, request_id);

        Ok(success.result)
    }

    pub fn get_logs(
        &self,
        from_block: u64,
        to_block: u64,
        address: &Address,
    ) -> Result<Vec<eth::Log>, RpcClientError> {
        use RpcClientError::{InterpretationError, ResponseError, SendError};

        let request_id =
            jsonrpc::Id::Num(RpcClient::make_id().expect("error generating request ID"));

        let request_body = format!(
            "{{
                \"jsonrpc\":\"2.0\",
                \"method\":\"eth_getLogs\",
                \"params\":[{{
                    \"fromBlock\":\"{:#x}\",
                    \"toBlock\":\"{:#x}\",
                    \"address\":{}
                }}],
                \"id\":{}
            }}",
            from_block,
            to_block,
            serde_json::json!(address),
            serde_json::json!(request_id),
        );

        let response_text = self
            .client
            .post(self.url.to_string())
            .body(request_body.clone())
            .send()
            .map_err(|err| SendError {
                msg: err.to_string(),
                request_body: request_body.clone(),
            })?
            .text()
            .map_err(|err| ResponseError {
                msg: err.to_string(),
                request_body: request_body.clone(),
            })?;

        let success: jsonrpc::Success<Vec<eth::Log>> = serde_json::from_str(&response_text)
            .map_err(|err| InterpretationError {
                msg: err.to_string(),
                request_body: request_body.clone(),
                expected_type: String::from("jsonrpc::Success<Vec<eth::Log>>"),
                response_text,
            })?;

        assert_eq!(success.id, request_id);

        Ok(success.result)
    }

    pub fn get_block_by_hash(
        &self,
        tx_hash: &H256,
        include_transactions: bool,
    ) -> Result<eth::Block<eth::Transaction>, RpcClientError> {
        use RpcClientError::{InterpretationError, ResponseError, SendError};

        let request_id =
            jsonrpc::Id::Num(RpcClient::make_id().expect("error generating request ID"));

        let request_body = format!(
            "{{
                \"jsonrpc\":\"2.0\",
                \"method\":\"eth_getBlockByHash\",
                \"params\":[{},{}],
                \"id\":{}
            }}",
            serde_json::json!(tx_hash),
            serde_json::json!(include_transactions),
            serde_json::json!(request_id),
        );

        let response_text = self
            .client
            .post(self.url.to_string())
            .body(request_body.clone())
            .send()
            .map_err(|err| SendError {
                msg: err.to_string(),
                request_body: request_body.clone(),
            })?
            .text()
            .map_err(|err| ResponseError {
                msg: err.to_string(),
                request_body: request_body.clone(),
            })?;

        let success: jsonrpc::Success<eth::Block<eth::Transaction>> =
            serde_json::from_str(&response_text).map_err(|err| InterpretationError {
                msg: err.to_string(),
                request_body: request_body.clone(),
                expected_type: String::from("jsonrpc::Success<eth::Block<eth::Transaction>>"),
                response_text,
            })?;

        assert_eq!(success.id, request_id);

        Ok(success.result)
    }

    pub fn get_block_by_number(
        &self,
        block_number: u64,
        include_transactions: bool,
    ) -> Result<eth::Block<eth::Transaction>, RpcClientError> {
        use RpcClientError::{InterpretationError, ResponseError, SendError};

        let request_id =
            jsonrpc::Id::Num(RpcClient::make_id().expect("error generating request ID"));

        let request_body = format!(
            "{{
                \"jsonrpc\":\"2.0\",
                \"method\":\"eth_getBlockByNumber\",
                \"params\":[\"{:#x}\",{}],
                \"id\":{}
            }}",
            block_number,
            serde_json::json!(include_transactions),
            serde_json::json!(request_id),
        );

        let response_text = self
            .client
            .post(self.url.to_string())
            .body(request_body.clone())
            .send()
            .map_err(|err| SendError {
                msg: err.to_string(),
                request_body: request_body.clone(),
            })?
            .text()
            .map_err(|err| ResponseError {
                msg: err.to_string(),
                request_body: request_body.clone(),
            })?;

        let success: jsonrpc::Success<eth::Block<eth::Transaction>> =
            serde_json::from_str(&response_text).map_err(|err| InterpretationError {
                msg: err.to_string(),
                request_body: request_body.clone(),
                expected_type: String::from("jsonrpc::Success<eth::Block<eth::Transaction>>"),
                response_text,
            })?;

        assert_eq!(success.id, request_id);

        Ok(success.result)
    }

    pub fn get_transaction_count(
        &self,
        address: &Address,
        block_number: u64,
    ) -> Result<U256, RpcClientError> {
        use RpcClientError::{InterpretationError, ResponseError, SendError};

        let request_id =
            jsonrpc::Id::Num(RpcClient::make_id().expect("error generating request ID"));

        let request_body = format!(
            "{{
                \"jsonrpc\":\"2.0\",
                \"method\":\"eth_getTransactionCount\",
                \"params\":[{},\"{:#x}\"],
                \"id\":{}
            }}",
            serde_json::json!(address),
            block_number,
            serde_json::json!(request_id),
        );

        let response_text = self
            .client
            .post(self.url.to_string())
            .body(request_body.clone())
            .send()
            .map_err(|err| SendError {
                msg: err.to_string(),
                request_body: request_body.clone(),
            })?
            .text()
            .map_err(|err| ResponseError {
                msg: err.to_string(),
                request_body: request_body.clone(),
            })?;

        let success: jsonrpc::Success<U256> =
            serde_json::from_str(&response_text).map_err(|err| InterpretationError {
                msg: err.to_string(),
                request_body: request_body.clone(),
                expected_type: String::from("jsonrpc::Success<U256>"),
                response_text,
            })?;

        assert_eq!(success.id, request_id);

        Ok(success.result)
    }

    pub fn get_account_data(
        &self,
        address: &Address,
        block_number: u64,
    ) -> Result<AccountData, RpcClientError> {
        use RpcClientError::{InterpretationError, ResponseError, SendError};

        let request_ids = [
            jsonrpc::Id::Num(RpcClient::make_id().expect("error generating request ID")),
            jsonrpc::Id::Num(RpcClient::make_id().expect("error generating request ID")),
            jsonrpc::Id::Num(RpcClient::make_id().expect("error generating request ID")),
        ];

        let request_body = format!(
            "[
                {{
                    \"jsonrpc\":\"2.0\",
                    \"method\":\"eth_getBalance\",
                    \"params\":[{},\"{:#x}\"],
                    \"id\":{}
                }},
                {{
                    \"jsonrpc\":\"2.0\",
                    \"method\":\"eth_getCode\",
                    \"params\":[{},\"{:#x}\"],
                    \"id\":{}
                }},
                {{
                    \"jsonrpc\":\"2.0\",
                    \"method\":\"eth_getTransactionCount\",
                    \"params\":[{},\"{:#x}\"],
                    \"id\":{}
                }}
            ]",
            serde_json::json!(address),
            block_number,
            serde_json::json!(request_ids[0]),
            serde_json::json!(address),
            block_number,
            serde_json::json!(request_ids[1]),
            serde_json::json!(address),
            block_number,
            serde_json::json!(request_ids[2]),
        );

        let response_text = self
            .client
            .post(self.url.to_string())
            .body(request_body.clone())
            .send()
            .map_err(|err| SendError {
                msg: err.to_string(),
                request_body: request_body.clone(),
            })?
            .text()
            .map_err(|err| ResponseError {
                msg: err.to_string(),
                request_body: request_body.clone(),
            })?;

        let results: (
            jsonrpc::Success<U256>,
            jsonrpc::Success<Bytes>,
            jsonrpc::Success<U256>,
        ) = serde_json::from_str(&response_text).map_err(|err| InterpretationError {
            msg: err.to_string(),
            request_body: request_body.clone(),
            expected_type: String::from("Array"),
            response_text,
        })?;

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

    use rethnet_eth::{Address, Bytes, U256};

    fn get_alchemy_url() -> Result<String, String> {
        Ok(std::env::var_os("ALCHEMY_URL")
            .expect("ALCHEMY_URL environment variable not defined")
            .into_string()
            .expect("couldn't convert OsString into a String"))
    }

    #[test]
    fn get_tx_by_hash_success() {
        use std::str::FromStr;

        let alchemy_url = get_alchemy_url().expect("failed to get Alchemy URL");

        let hash =
            H256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a")
                .expect("failed to parse hash from string");

        let tx: eth::Transaction = RpcClient::new(&alchemy_url)
            .get_tx_by_hash(&hash)
            .expect("failed to get transaction by hash");

        assert_eq!(
            tx.block_hash,
            Some(
                H256::from_str(
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

    #[test]
    fn get_tx_by_hash_dns_error() {
        let alchemy_url = "https://xxxeth-mainnet.g.alchemy.com";

        let hash =
            H256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a")
                .expect("failed to parse hash from string");

        let error_string = format!(
            "{:?}",
            RpcClient::new(alchemy_url)
                .get_tx_by_hash(&hash)
                .expect_err("should have failed to connect to a garbage domain name")
        );

        assert!(error_string.contains("SendError"));
        assert!(error_string.contains("dns error"));
    }

    #[test]
    fn get_tx_by_hash_bad_api_key() {
        let alchemy_url = "https://eth-mainnet.g.alchemy.com/v2/abcdefg";

        let hash =
            H256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a")
                .expect("failed to parse hash from string");

        let error_string = format!(
            "{:?}",
            RpcClient::new(alchemy_url)
                .get_tx_by_hash(&hash)
                .expect_err("should have failed to interpret response as a Transaction")
        );

        assert!(error_string.contains("InterpretationError"));
        assert!(error_string.contains("Success<eth::Transaction>"));
        assert!(error_string.contains("Must be authenticated!"));
    }

    #[test]
    fn get_tx_receipt_success() {
        let alchemy_url = get_alchemy_url().expect("failed to get Alchemy URL");

        let hash =
            H256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a")
                .expect("failed to parse hash from string");

        let receipt: eth::TransactionReceipt = RpcClient::new(&alchemy_url)
            .get_tx_receipt(&hash)
            .expect("failed to get transaction by hash");

        assert_eq!(
            receipt.block_hash,
            Some(
                H256::from_str(
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

    #[test]
    fn get_tx_receipt_dns_error() {
        let alchemy_url = "https://xxxeth-mainnet.g.alchemy.com";

        let hash =
            H256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a")
                .expect("failed to parse hash from string");

        let error_string = format!(
            "{:?}",
            RpcClient::new(alchemy_url)
                .get_tx_receipt(&hash)
                .expect_err("should have failed to connect to a garbage domain name")
        );

        assert!(error_string.contains("SendError"));
        assert!(error_string.contains("dns error"));
    }

    #[test]
    fn get_tx_receipt_bad_api_key() {
        let alchemy_url = "https://eth-mainnet.g.alchemy.com/v2/abcdefg";

        let hash =
            H256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a")
                .expect("failed to parse hash from string");

        let error_string = format!(
            "{:?}",
            RpcClient::new(alchemy_url)
                .get_tx_receipt(&hash)
                .expect_err("should have failed to interpret response as a Receipt")
        );

        assert!(error_string.contains("InterpretationError"));
        assert!(error_string.contains("Success<eth::TransactionReceipt>"));
        assert!(error_string.contains("Must be authenticated!"));
    }

    #[test]
    fn get_logs_success() {
        let alchemy_url = get_alchemy_url().expect("failed to get Alchemy URL");
        let logs = RpcClient::new(&alchemy_url)
            .get_logs(
                10496585,
                10496585,
                &Address::from_str("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
                    .expect("failed to parse data"),
            )
            .expect("failed to get logs");
        assert_eq!(logs.len(), 12);
        // TODO: assert more things about the log(s)
        // TODO: consider asserting something about the logs bloom
    }

    #[test]
    fn get_block_by_hash_success() {
        let alchemy_url = get_alchemy_url().expect("failed to get Alchemy URL");

        let hash =
            H256::from_str("0x71d5e7c8ff9ea737034c16e333a75575a4a94d29482e0c2b88f0a6a8369c1812")
                .expect("failed to parse hash from string");

        let block = RpcClient::new(&alchemy_url)
            .get_block_by_hash(&hash, true)
            .expect("should have succeeded");

        assert_eq!(block.hash, Some(hash));
        assert_eq!(block.transactions.len(), 192);
    }

    #[test]
    fn get_block_by_number_success() {
        let alchemy_url = get_alchemy_url().expect("failed to get Alchemy URL");

        let block_number = 16222385;

        let block = RpcClient::new(&alchemy_url)
            .get_block_by_number(block_number, true)
            .expect("should have succeeded");

        assert_eq!(block.number, Some(block_number));
        assert_eq!(block.transactions.len(), 102);
    }

    #[test]
    fn get_transaction_count_success() {
        let alchemy_url = get_alchemy_url().expect("failed to get Alchemy URL");

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        let transaction_count = RpcClient::new(&alchemy_url)
            .get_transaction_count(&dai_address, 16220843)
            .expect("should have succeeded");

        assert_eq!(transaction_count, U256::from(1));
    }

    #[test]
    fn get_account_data_success() {
        let alchemy_url = get_alchemy_url().expect("failed to get Alchemy URL");

        let dai_address = Address::from_str("0x6b175474e89094c44da98b954eedeac495271d0f")
            .expect("failed to parse address");

        let account_data = RpcClient::new(&alchemy_url)
            .get_account_data(&dai_address, 16220843)
            .expect("should have succeeded");

        assert_eq!(account_data.balance, U256::from(0));
        assert_eq!(account_data.code, Bytes::from("0x608060405234801561001057600080fd5b50600436106101425760003560e01c80637ecebe00116100b8578063a9059cbb1161007c578063a9059cbb146106b4578063b753a98c1461071a578063bb35783b14610768578063bf353dbb146107d6578063dd62ed3e1461082e578063f2d5d56b146108a657610142565b80637ecebe00146104a15780638fcbaf0c146104f957806395d89b411461059f5780639c52a7f1146106225780639dc29fac1461066657610142565b8063313ce5671161010a578063313ce567146102f25780633644e5151461031657806340c10f191461033457806354fd4d501461038257806365fae35e1461040557806370a082311461044957610142565b806306fdde0314610147578063095ea7b3146101ca57806318160ddd1461023057806323b872dd1461024e57806330adf81f146102d4575b600080fd5b61014f6108f4565b6040518080602001828103825283818151815260200191508051906020019080838360005b8381101561018f578082015181840152602081019050610174565b50505050905090810190601f1680156101bc5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b610216600480360360408110156101e057600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff1690602001909291908035906020019092919050505061092d565b604051808215151515815260200191505060405180910390f35b610238610a1f565b6040518082815260200191505060405180910390f35b6102ba6004803603606081101561026457600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050610a25565b604051808215151515815260200191505060405180910390f35b6102dc610f3a565b6040518082815260200191505060405180910390f35b6102fa610f61565b604051808260ff1660ff16815260200191505060405180910390f35b61031e610f66565b6040518082815260200191505060405180910390f35b6103806004803603604081101561034a57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050610f6c565b005b61038a611128565b6040518080602001828103825283818151815260200191508051906020019080838360005b838110156103ca5780820151818401526020810190506103af565b50505050905090810190601f1680156103f75780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6104476004803603602081101561041b57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050611161565b005b61048b6004803603602081101561045f57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919050505061128f565b6040518082815260200191505060405180910390f35b6104e3600480360360208110156104b757600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff1690602001909291905050506112a7565b6040518082815260200191505060405180910390f35b61059d600480360361010081101561051057600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff1690602001909291908035906020019092919080359060200190929190803515159060200190929190803560ff16906020019092919080359060200190929190803590602001909291905050506112bf565b005b6105a76117fa565b6040518080602001828103825283818151815260200191508051906020019080838360005b838110156105e75780820151818401526020810190506105cc565b50505050905090810190601f1680156106145780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6106646004803603602081101561063857600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050611833565b005b6106b26004803603604081101561067c57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050611961565b005b610700600480360360408110156106ca57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050611df4565b604051808215151515815260200191505060405180910390f35b6107666004803603604081101561073057600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050611e09565b005b6107d46004803603606081101561077e57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050611e19565b005b610818600480360360208110156107ec57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050611e2a565b6040518082815260200191505060405180910390f35b6108906004803603604081101561084457600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff169060200190929190505050611e42565b6040518082815260200191505060405180910390f35b6108f2600480360360408110156108bc57600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff16906020019092919080359060200190929190505050611e67565b005b6040518060400160405280600e81526020017f44616920537461626c65636f696e00000000000000000000000000000000000081525081565b600081600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040518082815260200191505060405180910390a36001905092915050565b60015481565b600081600260008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020541015610adc576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260188152602001807f4461692f696e73756666696369656e742d62616c616e6365000000000000000081525060200191505060405180910390fd5b3373ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff1614158015610bb457507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600360008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205414155b15610db25781600360008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020541015610cab576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252601a8152602001807f4461692f696e73756666696369656e742d616c6c6f77616e636500000000000081525060200191505060405180910390fd5b610d31600360008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205483611e77565b600360008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055505b610dfb600260008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205483611e77565b600260008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550610e87600260008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205483611e91565b600260008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040518082815260200191505060405180910390a3600190509392505050565b7fea2aa0a1be11a07ed86d755c93467f4f82362b452371d1ba94d1715123511acb60001b81565b601281565b60055481565b60016000803373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205414611020576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260128152602001807f4461692f6e6f742d617574686f72697a6564000000000000000000000000000081525060200191505060405180910390fd5b611069600260008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205482611e91565b600260008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055506110b860015482611e91565b6001819055508173ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040518082815260200191505060405180910390a35050565b6040518060400160405280600181526020017f310000000000000000000000000000000000000000000000000000000000000081525081565b60016000803373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205414611215576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260128152602001807f4461692f6e6f742d617574686f72697a6564000000000000000000000000000081525060200191505060405180910390fd5b60016000808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055505961012081016040526020815260e0602082015260e0600060408301376024356004353360003560e01c60e01b61012085a45050565b60026020528060005260406000206000915090505481565b60046020528060005260406000206000915090505481565b60006005547fea2aa0a1be11a07ed86d755c93467f4f82362b452371d1ba94d1715123511acb60001b8a8a8a8a8a604051602001808781526020018673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020018573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020018481526020018381526020018215151515815260200196505050505050506040516020818303038152906040528051906020012060405160200180807f190100000000000000000000000000000000000000000000000000000000000081525060020183815260200182815260200192505050604051602081830303815290604052805190602001209050600073ffffffffffffffffffffffffffffffffffffffff168973ffffffffffffffffffffffffffffffffffffffff16141561148c576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260158152602001807f4461692f696e76616c69642d616464726573732d30000000000000000000000081525060200191505060405180910390fd5b60018185858560405160008152602001604052604051808581526020018460ff1660ff1681526020018381526020018281526020019450505050506020604051602081039080840390855afa1580156114e9573d6000803e3d6000fd5b5050506020604051035173ffffffffffffffffffffffffffffffffffffffff168973ffffffffffffffffffffffffffffffffffffffff1614611593576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260128152602001807f4461692f696e76616c69642d7065726d6974000000000000000000000000000081525060200191505060405180910390fd5b60008614806115a25750854211155b611614576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260128152602001807f4461692f7065726d69742d65787069726564000000000000000000000000000081525060200191505060405180910390fd5b600460008a73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008154809291906001019190505587146116d6576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260118152602001807f4461692f696e76616c69642d6e6f6e636500000000000000000000000000000081525060200191505060405180910390fd5b6000856116e4576000611706565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff5b905080600360008c73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508873ffffffffffffffffffffffffffffffffffffffff168a73ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925836040518082815260200191505060405180910390a350505050505050505050565b6040518060400160405280600381526020017f444149000000000000000000000000000000000000000000000000000000000081525081565b60016000803373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054146118e7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260128152602001807f4461692f6e6f742d617574686f72697a6564000000000000000000000000000081525060200191505060405180910390fd5b60008060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055505961012081016040526020815260e0602082015260e0600060408301376024356004353360003560e01c60e01b61012085a45050565b80600260008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020541015611a16576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260188152602001807f4461692f696e73756666696369656e742d62616c616e6365000000000000000081525060200191505060405180910390fd5b3373ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1614158015611aee57507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600360008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205414155b15611cec5780600360008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020541015611be5576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040180806020018281038252601a8152602001807f4461692f696e73756666696369656e742d616c6c6f77616e636500000000000081525060200191505060405180910390fd5b611c6b600360008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205482611e77565b600360008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055505b611d35600260008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205482611e77565b600260008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002081905550611d8460015482611e77565b600181905550600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040518082815260200191505060405180910390a35050565b6000611e01338484610a25565b905092915050565b611e14338383610a25565b505050565b611e24838383610a25565b50505050565b60006020528060005260406000206000915090505481565b6003602052816000526040600020602052806000526040600020600091509150505481565b611e72823383610a25565b505050565b6000828284039150811115611e8b57600080fd5b92915050565b6000828284019150811015611ea557600080fd5b9291505056fea265627a7a72315820c0ae2c29860c0a59d5586a579abbcddfe4bcef0524a87301425cbc58c3e94e3164736f6c634300050c0032"));
        assert_eq!(account_data.transaction_count, U256::from(1));
    }
}
