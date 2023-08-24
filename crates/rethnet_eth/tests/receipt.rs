#[cfg(feature = "test-remote")]
mod remote {
    use lazy_static::lazy_static;
    use serial_test::serial;
    use tempfile::TempDir;

    lazy_static! {
        // Use same cache dir for all tests
        static ref CACHE_DIR: TempDir = TempDir::new().unwrap();
    }

    macro_rules! impl_test_remote_block_receipt_root {
        ($(
            $name:ident => $block_number:literal,
        )+) => {
            $(
                paste::item! {
                    #[tokio::test]
                    #[serial]
                    async fn [<test_remote_block_receipt_root_ $name>]() {
                        use futures::{stream, StreamExt};
                        use rethnet_eth::{block::BlockAndCallers, remote::{RpcClient, BlockSpec}, trie::ordered_trie_root};
                        use rethnet_test_utils::env::get_alchemy_url;
                        use revm_primitives::U256;

                        let client = RpcClient::new(&get_alchemy_url(), CACHE_DIR.path().into());

                        let block_number = U256::from($block_number);

                        let block = client
                            .get_block_by_number_with_transaction_data(BlockSpec::Number(block_number))
                            .await
                            .expect("Should succeed");

                        let receipts = stream::iter(block.transactions.iter())
                            .map(|transaction|
                                client
                                    .get_transaction_receipt(&transaction.hash)
                            )
                            // Limit concurrent requests to avoid getting rate limited.
                            .buffered(rethnet_defaults::MAX_CONCURRENT_REQUESTS)
                            .collect::<Vec<_>>()
                            .await.into_iter().collect::<Result<Vec<_>, _>>()
                            .expect("Should succeed");

                        let receipts_root = ordered_trie_root(
                            receipts
                                .into_iter()
                                .map(|receipt| rlp::encode(&**receipt.unwrap()).freeze()),
                        );

                        let BlockAndCallers { block, .. } = block
                            .try_into()
                            .expect("Conversion must succeed, as we're not retrieving a pending block");

                        assert_eq!(block.header.receipts_root, receipts_root);
                    }
                }
            )+
        };
    }

    impl_test_remote_block_receipt_root! {
        pre_eip658 => 1_500_000u64,
        post_eip658 => 5_370_000u64,
        eip2930 => 12_751_000u64, // block contains at least one transaction with type 1
        eip1559 => 14_000_000u64, // block contains at least one transaction with type 2
    }
}
