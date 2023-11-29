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
                        use edr_eth::{remote::{RpcClient, PreEip1898BlockSpec}, trie::ordered_trie_root};
                        use edr_test_utils::env::get_alchemy_url;

                        let client = RpcClient::new(&get_alchemy_url(), CACHE_DIR.path().into());

                        let block = client
                            .get_block_by_number_with_transaction_data(PreEip1898BlockSpec::Number($block_number))
                            .await
                            .expect("Should succeed");

                        let receipts = client.get_transaction_receipts(block.transactions.iter().map(|transaction| &transaction.hash))
                            .await
                            .expect("Should succeed")
                            .expect("All receipts of a block should exist");

                        let receipts_root = ordered_trie_root(
                            receipts
                                .into_iter()
                                .map(|receipt| rlp::encode(&**receipt).freeze()),
                        );

                        assert_eq!(block.receipts_root, receipts_root);
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
