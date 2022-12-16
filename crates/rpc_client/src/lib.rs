use rethnet_eth::H256;

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
//
// TODO: do more than just get-tx-by-hash.

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

    use rethnet_eth::{Address, Bytes, H256, U256};

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
    }

    fn optional_u64_from_hex<'de, D>(deserializer: D) -> Result<Option<u64>, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s: &str = serde::Deserialize::deserialize(deserializer)?;
        Ok(Some(u64::from_str_radix(&s[2..], 16).expect("whatever")))
    }

    fn u64_from_hex<'de, D>(deserializer: D) -> Result<u64, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s: &str = serde::Deserialize::deserialize(deserializer)?;
        Ok(u64::from_str_radix(&s[2..], 16).expect("whatever"))
    }
}

pub mod errors {
    #[derive(thiserror::Error, Debug)]
    pub enum GetTxByHashError {
        #[error("Response was not a Success<Transaction>")]
        InterpretationError { msg: String, response_text: String },

        #[error("Failed to send request")]
        SendError { msg: String },

        #[error("Failed to get response body")]
        ResponseError { msg: String },

        #[error(transparent)]
        OtherError(#[from] std::io::Error),
    }

    #[derive(thiserror::Error, Debug)]
    pub enum GetTxReceiptError {
        #[error("Response was not a Success<TransactionReceipt>")]
        InterpretationError { msg: String, response_text: String },

        #[error("Failed to send request")]
        SendError { msg: String },

        #[error("Failed to get response body")]
        ResponseError { msg: String },

        #[error(transparent)]
        OtherError(#[from] std::io::Error),
    }
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

    pub fn get_tx_by_hash(
        &self,
        tx_hash: H256,
    ) -> Result<eth::Transaction, errors::GetTxByHashError> {
        use errors::GetTxByHashError::{InterpretationError, ResponseError, SendError};

        let request_id =
            jsonrpc::Id::Num(RpcClient::make_id().expect("error generating request ID"));

        let response_text = self
            .client
            .post(self.url.to_string())
            .body(
                format!(
                    "{{\"jsonrpc\":\"2.0\",\"method\":\"eth_getTransactionByHash\",\"params\":[{}],\"id\":{}}}",
                    serde_json::json!(tx_hash),
                    serde_json::json!(request_id)
                )
            )
            .send()
            .map_err(|err| SendError {
                msg: err.to_string(),
            })?
            .text()
            .map_err(|err| ResponseError {
                msg: err.to_string(),
            })?;

        let success: jsonrpc::Success<eth::Transaction> = serde_json::from_str(&response_text)
            .map_err(|err| InterpretationError {
                msg: err.to_string(),
                response_text,
            })?;

        assert_eq!(success.id, request_id);

        Ok(success.result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use std::str::FromStr;

    use rethnet_eth::{Address, Bytes, U256};

    #[test]
    fn get_tx_by_hash_success() {
        use std::str::FromStr;

        let alchemy_url = std::env::var_os("ALCHEMY_URL")
            .expect("ALCHEMY_URL environment variable not defined")
            .into_string()
            .expect("couldn't convert OsString into a String");

        let hash =
            H256::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a")
                .expect("failed to parse hash from string");

        let tx: eth::Transaction = RpcClient::new(alchemy_url.as_str())
            .get_tx_by_hash(hash)
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
                .get_tx_by_hash(hash)
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
                .get_tx_by_hash(hash)
                .expect_err("should have failed to interpret response as a Transaction")
        );

        assert!(error_string.contains("InterpretationError"));
        assert!(error_string.contains("Must be authenticated!"));
    }

    // TODO: write some tests that exercise the errors i coded.
}
