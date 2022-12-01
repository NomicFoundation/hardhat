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
// TODO: finish implementing get-tx-by-hash, then do others

// TODO: Consider using a standard ethereum types library instead of reinventing the wheel here.
#[derive(serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    /*
    TODO: stop saying everything is a String, ideally by deferring to some standard type rather
    than coding any of this here, or at the very least look into what data types QUANTITY and DATA
    should be, perhaps involving RLP decoding for numbers, and who knows what for DATA. more
    specifically, conform to the data types below, excerpted from https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_gettransactionbyhash

    blockHash: DATA, 32 Bytes - hash of the block where this transaction was in. null when its pending.
    blockNumber: QUANTITY - block number where this transaction was in. null when its pending.
    from: DATA, 20 Bytes - address of the sender.
    gas: QUANTITY - gas provided by the sender.
    gasPrice: QUANTITY - gas price provided by the sender in Wei.
    hash: DATA, 32 Bytes - hash of the transaction.
    input: DATA - the data send along with the transaction.
    nonce: QUANTITY - the number of transactions made by the sender prior to this one.
    to: DATA, 20 Bytes - address of the receiver. null when its a contract creation transaction.
    transactionIndex: QUANTITY - integer of the transactions index position in the block. null when its pending.
    value: QUANTITY - value transferred in Wei.
    v: QUANTITY - ECDSA recovery id
    r: QUANTITY - ECDSA signature r
    s: QUANTITY - ECDSA signature s
    */
    block_hash: String,
    block_number: String,
    from: String,
    gas: String,
    gas_price: String,
    hash: String,
    input: String,
    nonce: String,
    to: String,
    transaction_index: String,
    value: String,
    v: String,
    r: String,
    s: String,
}

pub fn get_tx_by_hash(
    url: String,
    tx_hash: String,
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

    #[test]
    fn get_tx_by_hash_success() {
        let alchemy_url = std::env::var_os("ALCHEMY_URL")
            .expect("ALCHEMY_URL environment variable not defined")
            .into_string()
            .expect("couldn't convert OsString into a String");

        let hash =
            String::from("0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a");
        let tx: Transaction =
            get_tx_by_hash(alchemy_url, hash).expect("failed to get transaction by hash");
        assert_eq!(
            tx.block_hash,
            "0x88fadbb673928c61b9ede3694ae0589ac77ae38ec90a24a6e12e83f42f18c7e8"
        );
        assert_eq!(tx.block_number, "0xa74fde");
        assert_eq!(
            tx.hash,
            "0xc008e9f9bb92057dd0035496fbf4fb54f66b4b18b370928e46d6603933054d5a"
        );
        assert_eq!(tx.from, "0x7d97fcdb98632a91be79d3122b4eb99c0c4223ee");
        assert_eq!(tx.gas, "0x30d40");
        assert_eq!(tx.gas_price, "0x1e449a99b8");
        assert_eq!(tx.input, "0xa9059cbb000000000000000000000000e2c1e729e05f34c07d80083982ccd9154045dcc600000000000000000000000000000000000000000000000000000004a817c800");
        assert_eq!(tx.nonce, "0x653b");
        assert_eq!(
            tx.r,
            "0xeb56df45bd355e182fba854506bc73737df275af5a323d30f98db13fdf44393a"
        );
        assert_eq!(
            tx.s,
            "0x2c6efcd210cdc7b3d3191360f796ca84cab25a52ed8f72efff1652adaabc1c83"
        );
        assert_eq!(tx.to, "0xdac17f958d2ee523a2206206994597c13d831ec7");
        assert_eq!(tx.transaction_index, "0x88");
        assert_eq!(tx.v, "0x1c");
        assert_eq!(tx.value, "0x0");
    }

    // TODO: write some tests that exercise the errors i coded.
}
