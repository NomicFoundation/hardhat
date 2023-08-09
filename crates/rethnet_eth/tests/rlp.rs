#[cfg(feature = "test-remote")]
mod alchemy {

    use rethnet_eth::{block::BlockAndCallers, remote::RpcClient};
    use rethnet_test_utils::env::get_alchemy_url;
    use revm_primitives::B256;

    #[tokio::test]
    async fn test_rlp_remote_transaction() {
        let client = RpcClient::new(&get_alchemy_url());

        let block_hash = B256::from_slice(
            &hex::decode("ab2f5b10fe6f1fa7733d0541f0b77605e65a595a0f22d1efe3b8be90428db6e2")
                .unwrap(),
        );

        let block = client
            .get_block_by_hash_with_transaction_data(&block_hash)
            .await
            .expect("Should succeed")
            .expect("Block must exist");

        let transaction_hashes: Vec<B256> = block
            .transactions
            .iter()
            .map(|transaction| transaction.hash)
            .collect();

        let BlockAndCallers { block, .. } = block
            .try_into()
            .expect("Conversion must succeed, as we're not retrieving a pending block");

        for (i, transaction) in block.transactions.iter().enumerate() {
            assert_eq!(transaction_hashes[i], transaction.hash());
        }
    }
}
