#[cfg(feature = "test-remote")]
mod alchemy {
    macro_rules! impl_test_transaction_remote_hash {
        ($(
            $name:ident => $block_number:literal,
        )+) => {
            $(
                paste::item! {
                    #[tokio::test]
                    async fn [<test_transaction_remote_ $name _hash>]() {
                        use rethnet_eth::{block::BlockAndCallers, remote::{RpcClient, BlockSpec}};
                        use rethnet_test_utils::env::get_alchemy_url;
                        use revm_primitives::{B256, U256};
                        use tempfile::TempDir;

                        let tempdir = TempDir::new().unwrap();
                        let client = RpcClient::new(&get_alchemy_url(), tempdir.path().into());

                        let block_number = U256::from($block_number);

                        let block = client
                            .get_block_by_number_with_transaction_data(BlockSpec::Number(block_number))
                            .await
                            .expect("Should succeed");

                        let transaction_hashes: Vec<B256> = block
                            .transactions
                            .iter()
                            .map(|transaction| transaction.hash)
                            .collect();

                        let BlockAndCallers { block, .. } = block
                            .try_into()
                            .expect("Conversion must succeed, as we're not retrieving a pending block");

                        for (index, transaction) in block.transactions.iter().enumerate() {
                            assert_eq!(transaction_hashes[index], transaction.hash());
                        }
                    }
                }
            )+
        };
    }

    impl_test_transaction_remote_hash! {
        legacy => 1_500_000u64,
        eip155 => 2_675_000u64,
        eip2930 => 12_244_000u64,
        eip1559 => 12_965_000u64,
    }
}
