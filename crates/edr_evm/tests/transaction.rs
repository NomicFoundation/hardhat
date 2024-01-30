#[cfg(feature = "test-remote")]
mod alchemy {
    macro_rules! impl_test_transaction_remote_hash {
        ($(
            $name:ident => $block_number:literal,
        )+) => {
            $(
                paste::item! {
                    #[tokio::test]
                    async fn [<transaction_remote_ $name _hash>]() {
                        use edr_eth::{
                            remote::{RpcClient, PreEip1898BlockSpec},
                            B256
                        };
                        use edr_evm::ExecutableTransaction;
                        use edr_test_utils::env::get_alchemy_url;
                        use tempfile::TempDir;

                        let tempdir = TempDir::new().unwrap();
                        let client = RpcClient::new(&get_alchemy_url(), tempdir.path().into(), None).expect("url ok");

                        let block = client
                            .get_block_by_number_with_transaction_data(PreEip1898BlockSpec::Number($block_number))
                            .await
                            .expect("Should succeed");

                        let transaction_hashes: Vec<B256> = block
                            .transactions
                            .iter()
                            .map(|transaction| transaction.hash)
                            .collect();

                        let transactions =
                                block.transactions.into_iter().map(ExecutableTransaction::try_from).collect::<Result<Vec<_>, _>>()
                                    .expect("Conversion must succeed, as we're not retrieving a pending block");

                        for (index, transaction) in transactions.iter().enumerate() {
                            assert_eq!(transaction_hashes[index], *transaction.hash());
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
