#[cfg(feature = "test-remote")]
mod alchemy {
    macro_rules! impl_test_remote_block_receipt_root {
        ($(
            $name:ident => $block_number:literal,
        )+) => {
            $(
                paste::item! {
                    #[tokio::test]
                    async fn [<test_remote_block_receipt_root_ $name>]() {
                        use futures::future::{self, FutureExt};
                        use rethnet_eth::{block::BlockAndCallers, remote::{RpcClient, BlockSpec}, trie::ordered_trie_root};
                        use rethnet_test_utils::env::get_alchemy_url;
                        use revm_primitives::U256;
                        use tempfile::TempDir;

                        let tempdir = TempDir::new().unwrap();
                        let client = RpcClient::new(&get_alchemy_url(), tempdir.path().into());

                        let block_number = U256::from($block_number);

                        let block = client
                            .get_block_by_number_with_transaction_data(BlockSpec::Number(block_number))
                            .await
                            .expect("Should succeed");

                        let receipts = future::try_join_all(block.transactions.iter().map(|transaction| {
                            client
                                .get_transaction_receipt(&transaction.hash)
                                .map(|result| result.map(|result| result.unwrap()))
                        })).await.expect("Should succeed");

                        let receipts_root = ordered_trie_root(
                            receipts
                                .into_iter()
                                .map(|receipt| rlp::encode(&**receipt).freeze()),
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
