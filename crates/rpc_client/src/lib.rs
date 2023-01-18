use ethers::types::{Transaction, TxHash};

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

pub fn get_tx_by_hash(
    url: &str,
    tx_hash: TxHash,
) -> Result<Transaction, Box<dyn std::error::Error>> {
    use jsonrpc_types::{Call, MethodCall, Params};
    let response = reqwest::blocking::Client::new()
        .post(url)
        .json(&jsonrpc_types::Request::Single(Call::MethodCall(
            MethodCall::new(
                "eth_getTransactionByHash",
                Some(Params::Array(vec![serde_json::json!(tx_hash)])),
                1.into(),
            ),
        )))
        .send()
        .expect("failed to send");

    let response_text_ = response.text().expect("failed to get response text");
    let response_text = response_text_.as_str();

    let success: jsonrpc_types::Success<Transaction> = serde_json::from_str(response_text)
        .unwrap_or_else(|_| {
            panic!(
                "failed to interpret as Transaction response string \"{}\"",
                response_text
            )
        });

    Ok(success.result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use ethers::types::{Bytes, H160, H256, U256, U64};

    #[test]
    fn get_tx_by_hash_success() {
        let alchemy_url = std::env::var_os("ALCHEMY_URL")
            .expect("ALCHEMY_URL environment variable not defined")
            .into_string()
            .expect("couldn't convert OsString into a String");

        use std::str::FromStr;

        let hash =
            TxHash::from_str("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a")
                .expect("failed to parse hash from string");

        let tx: Transaction =
            get_tx_by_hash(alchemy_url.as_str(), hash).expect("failed to get transaction by hash");

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
            Some(U64::from_str("a74fde").expect("couldn't parse data"))
        );
        assert_eq!(tx.hash, hash);
        assert_eq!(
            tx.from,
            H160::from_str("0x7d97fcdb98632a91be79d3122b4eb99c0c4223ee")
                .expect("couldn't parse data")
        );
        assert_eq!(
            tx.gas,
            U256::from_str("30d40").expect("couldn't parse data")
        );
        assert_eq!(
            tx.gas_price,
            Some(U256::from_str("1e449a99b8").expect("couldn't parse data"))
        );
        assert_eq!(tx.input, Bytes::from_str("a9059cbb000000000000000000000000e2c1e729e05f34c07d80083982ccd9154045dcc600000000000000000000000000000000000000000000000000000004a817c800").expect("couldn't parse data"));
        assert_eq!(
            tx.nonce,
            U256::from_str("653b").expect("couldn't parse data")
        );
        assert_eq!(
            tx.r,
            U256::from_str("eb56df45bd355e182fba854506bc73737df275af5a323d30f98db13fdf44393a")
                .expect("couldn't parse data")
        );
        assert_eq!(
            tx.s,
            U256::from_str("2c6efcd210cdc7b3d3191360f796ca84cab25a52ed8f72efff1652adaabc1c83")
                .expect("couldn't parse data")
        );
        assert_eq!(
            tx.to,
            Some(
                H160::from_str("dac17f958d2ee523a2206206994597c13d831ec7")
                    .expect("couldn't parse data")
            )
        );
        assert_eq!(
            tx.transaction_index,
            Some(U64::from_str("88").expect("couldn't parse data"))
        );
        assert_eq!(tx.v, U64::from_str("1c").expect("couldn't parse data"));
        assert_eq!(tx.value, U256::from_str("0").expect("couldn't parse data"));
    }

    // TODO: write some tests that exercise the errors i coded.
}
