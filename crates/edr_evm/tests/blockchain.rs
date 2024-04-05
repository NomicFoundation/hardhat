#![cfg(feature = "test-utils")]

use std::sync::Arc;

use edr_eth::{
    block::PartialHeader,
    log::FilterLog,
    receipt::{TransactionReceipt, TypedReceipt, TypedReceiptData},
    Address, Bloom, Bytes, B256, U256,
};
use edr_evm::{
    blockchain::{BlockchainError, GenesisBlockOptions, LocalBlockchain, SyncBlockchain},
    state::{StateDiff, StateError},
    test_utils::dummy_eip155_transaction,
    HashSet, LocalBlock, Log, SpecId, SyncBlock,
};
use serial_test::serial;

#[cfg(feature = "test-remote")]
const REMOTE_BLOCK_NUMBER: u64 = 10_496_585;

#[cfg(feature = "test-remote")]
const REMOTE_BLOCK_HASH: &str =
    "0x71d5e7c8ff9ea737034c16e333a75575a4a94d29482e0c2b88f0a6a8369c1812";

#[cfg(feature = "test-remote")]
const REMOTE_BLOCK_FIRST_TRANSACTION_HASH: &str =
    "0xed0b0b132bd693ef34a72084f090df07c5c3a2ec019d76316da040d4222cdfb8";

#[cfg(feature = "test-remote")]
const REMOTE_BLOCK_LAST_TRANSACTION_HASH: &str =
    "0xd809fb6f7060abc8de068c7a38e9b2b04530baf0cc4ce9a2420d59388be10ee7";

#[cfg(feature = "test-remote")]
async fn create_forked_dummy_blockchain(
    fork_block_number: Option<u64>,
) -> Box<dyn SyncBlockchain<BlockchainError, StateError>> {
    use edr_eth::remote::RpcClient;
    use edr_evm::{
        blockchain::ForkedBlockchain, state::IrregularState, HashMap, RandomHashGenerator,
    };
    use edr_test_utils::env::get_alchemy_url;
    use parking_lot::Mutex;

    let rpc_client =
        RpcClient::new(&get_alchemy_url(), edr_defaults::CACHE_DIR.into(), None).expect("url ok");

    let mut irregular_state = IrregularState::default();
    Box::new(
        ForkedBlockchain::new(
            tokio::runtime::Handle::current().clone(),
            None,
            SpecId::LATEST,
            Arc::new(rpc_client),
            fork_block_number,
            &mut irregular_state,
            Arc::new(Mutex::new(RandomHashGenerator::with_seed(
                edr_defaults::STATE_ROOT_HASH_SEED,
            ))),
            &HashMap::new(),
        )
        .await
        .expect("Failed to construct forked blockchain"),
    )
}

// The cache directory is only used when the `test-remote` feature is enabled
#[allow(unused_variables)]
async fn create_dummy_blockchains() -> Vec<Box<dyn SyncBlockchain<BlockchainError, StateError>>> {
    const DEFAULT_GAS_LIMIT: u64 = 0xffffffffffffff;
    const DEFAULT_INITIAL_BASE_FEE: u64 = 1000000000;

    let local_blockchain = LocalBlockchain::new(
        StateDiff::default(),
        1,
        SpecId::LATEST,
        GenesisBlockOptions {
            gas_limit: Some(DEFAULT_GAS_LIMIT),
            mix_hash: Some(B256::ZERO),
            base_fee: Some(U256::from(DEFAULT_INITIAL_BASE_FEE)),
            ..GenesisBlockOptions::default()
        },
    )
    .expect("Should construct without issues");

    vec![
        Box::new(local_blockchain),
        #[cfg(feature = "test-remote")]
        create_forked_dummy_blockchain(None).await,
    ]
}

fn create_dummy_block(blockchain: &dyn SyncBlockchain<BlockchainError, StateError>) -> LocalBlock {
    let block_number = blockchain.last_block_number() + 1;

    create_dummy_block_with_number(blockchain, block_number)
}

fn create_dummy_block_with_number(
    blockchain: &dyn SyncBlockchain<BlockchainError, StateError>,
    number: u64,
) -> LocalBlock {
    let parent_hash = *blockchain
        .last_block()
        .expect("Failed to retrieve last block")
        .hash();

    create_dummy_block_with_hash(blockchain.spec_id(), number, parent_hash)
}

fn create_dummy_block_with_difficulty(
    blockchain: &dyn SyncBlockchain<BlockchainError, StateError>,
    number: u64,
    difficulty: u64,
) -> LocalBlock {
    let parent_hash = *blockchain
        .last_block()
        .expect("Failed to retrieve last block")
        .hash();

    create_dummy_block_with_header(
        blockchain.spec_id(),
        PartialHeader {
            number,
            parent_hash,
            difficulty: U256::from(difficulty),
            ..PartialHeader::default()
        },
    )
}

fn create_dummy_block_with_hash(spec_id: SpecId, number: u64, parent_hash: B256) -> LocalBlock {
    create_dummy_block_with_header(
        spec_id,
        PartialHeader {
            parent_hash,
            number,
            ..PartialHeader::default()
        },
    )
}

fn create_dummy_block_with_header(spec_id: SpecId, partial_header: PartialHeader) -> LocalBlock {
    LocalBlock::empty(spec_id, partial_header)
}

struct DummyBlockAndTransaction {
    block: Arc<dyn SyncBlock<Error = BlockchainError>>,
    transaction_hash: B256,
    transaction_receipt: TransactionReceipt<Log>,
}

/// Returns the transaction's hash.
fn insert_dummy_block_with_transaction(
    blockchain: &mut dyn SyncBlockchain<BlockchainError, StateError>,
) -> anyhow::Result<DummyBlockAndTransaction> {
    const GAS_USED: u64 = 100;

    let caller = Address::random();
    let transaction = dummy_eip155_transaction(caller, 0)?;
    let transaction_hash = *transaction.hash();

    let header = PartialHeader {
        number: blockchain.last_block_number() + 1,
        parent_hash: *blockchain.last_block()?.hash(),
        gas_used: GAS_USED,
        ..PartialHeader::default()
    };

    let transaction_receipt = TransactionReceipt {
        inner: TypedReceipt {
            cumulative_gas_used: GAS_USED,
            logs_bloom: Bloom::default(),
            logs: vec![
                Log::new_unchecked(Address::random(), Vec::new(), Bytes::new()),
                Log::new_unchecked(Address::random(), Vec::new(), Bytes::new()),
            ],
            data: TypedReceiptData::PostEip658Legacy { status: 1 },
            spec_id: blockchain.spec_id(),
        },
        transaction_hash: *transaction.hash(),
        transaction_index: 0,
        from: *transaction.caller(),
        to: transaction.to(),
        contract_address: None,
        gas_used: GAS_USED,
        effective_gas_price: None,
    };

    let block = LocalBlock::new(
        header,
        vec![transaction],
        vec![transaction_receipt.clone()],
        Vec::new(),
        Some(Vec::new()),
    );
    let block = blockchain.insert_block(block, StateDiff::default())?;
    assert_eq!(block.block.transactions().len(), 1);

    Ok(DummyBlockAndTransaction {
        block: block.block,
        transaction_hash,
        transaction_receipt,
    })
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn get_last_block() -> anyhow::Result<()> {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let last_block_number = blockchain.last_block_number();

        let last_block = blockchain.last_block()?;
        assert_eq!(last_block.header().number, last_block_number);

        let next_block = create_dummy_block(blockchain.as_ref());
        let expected = blockchain.insert_block(next_block, StateDiff::default())?;

        assert_eq!(blockchain.last_block()?.hash(), expected.block.hash());
    }

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn block_by_hash_some() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let next_block = create_dummy_block(blockchain.as_ref());
        let expected = blockchain
            .insert_block(next_block, StateDiff::default())
            .expect("Failed to insert block");

        assert_eq!(
            blockchain
                .block_by_hash(expected.block.hash())
                .unwrap()
                .unwrap()
                .hash(),
            expected.block.hash()
        );
    }
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn block_by_hash_none() {
    let blockchains = create_dummy_blockchains().await;

    for blockchain in blockchains {
        assert!(blockchain.block_by_hash(&B256::ZERO).unwrap().is_none());
    }
}

#[cfg(feature = "test-remote")]
#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn block_by_hash_remote() -> anyhow::Result<()> {
    use std::str::FromStr;

    let blockchain = create_forked_dummy_blockchain(None).await;

    let block = blockchain
        .block_by_hash(&B256::from_str(REMOTE_BLOCK_HASH)?)?
        .unwrap();

    assert_eq!(block.header().number, REMOTE_BLOCK_NUMBER);

    let transactions = block.transactions();
    assert_eq!(transactions.len(), 192);
    assert_eq!(
        *transactions[0].hash(),
        B256::from_str(REMOTE_BLOCK_FIRST_TRANSACTION_HASH)?
    );
    assert_eq!(
        *transactions[transactions.len() - 1].hash(),
        B256::from_str(REMOTE_BLOCK_LAST_TRANSACTION_HASH)?
    );

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn block_by_number_some() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let next_block = create_dummy_block(blockchain.as_ref());
        let expected = blockchain
            .insert_block(next_block, StateDiff::default())
            .expect("Failed to insert block");

        assert_eq!(
            blockchain
                .block_by_number(expected.block.header().number)
                .unwrap()
                .unwrap()
                .hash(),
            expected.block.hash(),
        );
    }
}

#[cfg(feature = "test-remote")]
#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn block_by_number_with_create() -> anyhow::Result<()> {
    use std::str::FromStr;

    use edr_eth::transaction::TransactionKind;

    const DAI_CREATION_BLOCK_NUMBER: u64 = 4_719_568;
    const DAI_CREATION_TRANSACTION_INDEX: usize = 85;
    const DAI_CREATION_TRANSACTION_HASH: &str =
        "0xb95343413e459a0f97461812111254163ae53467855c0d73e0f1e7c5b8442fa3";

    let blockchain = create_forked_dummy_blockchain(None).await;

    let block = blockchain
        .block_by_number(DAI_CREATION_BLOCK_NUMBER)?
        .unwrap();
    let transactions = block.transactions();

    assert_eq!(
        *transactions[DAI_CREATION_TRANSACTION_INDEX].hash(),
        B256::from_str(DAI_CREATION_TRANSACTION_HASH)?
    );
    assert!(matches!(
        transactions[DAI_CREATION_TRANSACTION_INDEX].kind(),
        TransactionKind::Create
    ));

    Ok(())
}

#[tokio::test]
#[serial]
async fn block_by_number_none() {
    let blockchains = create_dummy_blockchains().await;

    for blockchain in blockchains {
        let next_block_number = blockchain.last_block_number() + 1;
        assert!(blockchain
            .block_by_number(next_block_number)
            .unwrap()
            .is_none());
    }
}

#[cfg(feature = "test-remote")]
#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn block_by_number_remote() -> anyhow::Result<()> {
    use std::str::FromStr;

    let blockchain = create_forked_dummy_blockchain(None).await;

    let block = blockchain.block_by_number(REMOTE_BLOCK_NUMBER)?.unwrap();

    let expected_hash = B256::from_str(REMOTE_BLOCK_HASH)?;
    assert_eq!(*block.hash(), expected_hash);

    let transactions = block.transactions();
    assert_eq!(transactions.len(), 192);
    assert_eq!(
        *transactions[0].hash(),
        B256::from_str(REMOTE_BLOCK_FIRST_TRANSACTION_HASH)?
    );
    assert_eq!(
        *transactions[transactions.len() - 1].hash(),
        B256::from_str(REMOTE_BLOCK_LAST_TRANSACTION_HASH)?
    );

    Ok(())
}

#[cfg(feature = "test-remote")]
#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn block_by_caches_remote() -> anyhow::Result<()> {
    use std::str::FromStr;

    let blockchain = create_forked_dummy_blockchain(None).await;

    let block1 = blockchain.block_by_number(REMOTE_BLOCK_NUMBER)?.unwrap();
    let block2 = blockchain
        .block_by_hash(&B256::from_str(REMOTE_BLOCK_HASH)?)?
        .unwrap();
    let block3 = blockchain.block_by_number(REMOTE_BLOCK_NUMBER)?.unwrap();
    let block4 = blockchain
        .block_by_hash(&B256::from_str(REMOTE_BLOCK_HASH)?)?
        .unwrap();

    assert!(Arc::ptr_eq(&block1, &block2));
    assert!(Arc::ptr_eq(&block2, &block3));
    assert!(Arc::ptr_eq(&block3, &block4));

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn insert_block_multiple() -> anyhow::Result<()> {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let one = create_dummy_block(blockchain.as_ref());
        let one = blockchain.insert_block(one, StateDiff::default())?;

        let two = create_dummy_block(blockchain.as_ref());
        let two = blockchain.insert_block(two, StateDiff::default())?;

        assert_eq!(
            blockchain
                .block_by_number(one.block.header().number)?
                .unwrap()
                .hash(),
            one.block.hash()
        );
        assert_eq!(
            blockchain.block_by_hash(two.block.hash())?.unwrap().hash(),
            two.block.hash()
        );
    }

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn insert_block_invalid_block_number() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let next_block_number = blockchain.last_block_number() + 1;
        let invalid_block_number = next_block_number + 1;

        let invalid_block =
            create_dummy_block_with_number(blockchain.as_ref(), invalid_block_number);
        let error = blockchain
            .insert_block(invalid_block, StateDiff::default())
            .expect_err("Should fail to insert block");

        if let BlockchainError::InvalidBlockNumber { actual, expected } = error {
            assert_eq!(actual, invalid_block_number);
            assert_eq!(expected, next_block_number);
        } else {
            panic!("Unexpected error: {error:?}");
        }
    }
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn insert_block_invalid_parent_hash() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        const INVALID_BLOCK_HASH: B256 = B256::ZERO;
        let next_block_number = blockchain.last_block_number() + 1;

        let one = create_dummy_block_with_hash(
            blockchain.spec_id(),
            next_block_number,
            INVALID_BLOCK_HASH,
        );
        let error = blockchain
            .insert_block(one, StateDiff::default())
            .expect_err("Should fail to insert block");

        if let BlockchainError::InvalidParentHash { actual, expected } = error {
            assert_eq!(actual, INVALID_BLOCK_HASH);
            assert_eq!(expected, *blockchain.last_block().unwrap().hash());
        } else {
            panic!("Unexpected error: {error:?}");
        }
    }
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn logs_local() -> anyhow::Result<()> {
    fn assert_eq_logs(actual: &[FilterLog], expected: &[Log]) {
        assert_eq!(expected.len(), actual.len());

        for (log, filter_log) in expected.iter().zip(actual.iter()) {
            assert_eq!(log.address, filter_log.address);
            assert_eq!(log.topics(), filter_log.topics());
            assert_eq!(log.data, filter_log.data);
        }
    }

    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let last_block_number = blockchain.last_block_number();

        let DummyBlockAndTransaction {
            block: one,
            transaction_receipt,
            ..
        } = insert_dummy_block_with_transaction(blockchain.as_mut())?;

        let filtered_logs = blockchain.logs(
            one.header().number,
            one.header().number,
            &HashSet::default(),
            &[],
        )?;

        assert_eq_logs(&filtered_logs, &transaction_receipt.logs);

        let logs = transaction_receipt.logs.iter();
        let DummyBlockAndTransaction {
            block: two,
            transaction_receipt,
            ..
        } = insert_dummy_block_with_transaction(blockchain.as_mut())?;

        let logs: Vec<Log> = logs
            .chain(transaction_receipt.logs.iter())
            .cloned()
            .collect();

        let filtered_logs = blockchain.logs(
            one.header().number,
            two.header().number,
            &HashSet::default(),
            &[],
        )?;

        assert_eq_logs(&filtered_logs, &logs);

        // Removed blocks should not have logs
        blockchain.revert_to_block(last_block_number)?;

        let filtered_logs = blockchain.logs(
            one.header().number,
            two.header().number,
            &HashSet::default(),
            &[],
        )?;

        assert!(filtered_logs.is_empty());
    }

    Ok(())
}

/// See results at https://api.etherscan.io/api?module=logs&action=getLogs&fromBlock=10496585&toBlock=10496585&address=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
#[cfg(feature = "test-remote")]
#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn logs_remote() -> anyhow::Result<()> {
    use std::str::FromStr;

    let blockchain = create_forked_dummy_blockchain(None).await;

    let address = Address::from_str("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")?;
    let addresses = [address].into_iter().collect();

    let logs = blockchain.logs(REMOTE_BLOCK_NUMBER, REMOTE_BLOCK_NUMBER, &addresses, &[])?;

    assert_eq!(logs.len(), 12);

    let expected = [1, 4, 13, 14, 17, 20, 27, 30, 41, 42, 139, 140];
    logs.iter().zip(expected).for_each(|(log, expected_index)| {
        assert_eq!(log.log_index, expected_index);
    });

    Ok(())
}

#[cfg(feature = "test-remote")]
#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn logs_remote_and_local() -> anyhow::Result<()> {
    let mut blockchain = create_forked_dummy_blockchain(Some(REMOTE_BLOCK_NUMBER)).await;

    insert_dummy_block_with_transaction(blockchain.as_mut())?;
    insert_dummy_block_with_transaction(blockchain.as_mut())?;

    let logs = blockchain.logs(
        REMOTE_BLOCK_NUMBER,
        REMOTE_BLOCK_NUMBER + 1,
        &HashSet::default(),
        &[],
    )?;

    assert_eq!(logs.len(), 207);

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn revert_to_block_local() -> anyhow::Result<()> {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let last_block = blockchain.last_block()?;

        let one = create_dummy_block(blockchain.as_ref());
        let one = blockchain.insert_block(one, StateDiff::default())?;

        let two = create_dummy_block(blockchain.as_ref());
        let two = blockchain.insert_block(two, StateDiff::default())?;

        blockchain.revert_to_block(last_block.header().number)?;

        // Last block still exists
        assert_eq!(blockchain.last_block()?.hash(), last_block.hash());
        assert_eq!(last_block.header().number, blockchain.last_block_number());

        assert_eq!(
            blockchain.block_by_hash(last_block.hash())?.unwrap().hash(),
            last_block.hash()
        );

        // Blocks 1 and 2 are gone
        assert!(blockchain
            .block_by_number(one.block.header().number)?
            .is_none());

        assert!(blockchain
            .block_by_number(two.block.header().number)?
            .is_none());

        assert!(blockchain.block_by_hash(one.block.hash())?.is_none());
        assert!(blockchain.block_by_hash(two.block.hash())?.is_none());

        // Can insert a new block after reverting
        let new = create_dummy_block(blockchain.as_ref());
        let new = blockchain.insert_block(new.clone(), StateDiff::default())?;

        assert_eq!(blockchain.last_block()?.hash(), new.block.hash());
    }

    Ok(())
}

#[cfg(feature = "test-remote")]
#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn revert_to_block_remote() -> anyhow::Result<()> {
    use edr_evm::blockchain::ForkedBlockchainError;

    let mut blockchain = create_forked_dummy_blockchain(None).await;

    let last_block_number = blockchain.last_block_number();
    let error = blockchain
        .revert_to_block(last_block_number - 1)
        .unwrap_err();

    assert!(matches!(
        error,
        BlockchainError::Forked(ForkedBlockchainError::CannotDeleteRemote)
    ));

    Ok(())
}

#[tokio::test]
#[serial]
async fn revert_to_block_invalid_number() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let next_block_number = blockchain.last_block_number() + 1;
        let error = blockchain
            .revert_to_block(next_block_number)
            .expect_err("Should fail to insert block");

        assert!(matches!(error, BlockchainError::UnknownBlockNumber));
    }
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn block_total_difficulty_by_hash() {
    let blockchains: Vec<Box<dyn SyncBlockchain<BlockchainError, StateError>>> =
        create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let last_block = blockchain.last_block().unwrap();
        let last_block_header = last_block.header();

        let one = create_dummy_block_with_difficulty(
            blockchain.as_ref(),
            last_block_header.number + 1,
            1000,
        );
        let one = blockchain.insert_block(one, StateDiff::default()).unwrap();

        let two = create_dummy_block_with_difficulty(
            blockchain.as_ref(),
            last_block_header.number + 2,
            2000,
        );
        let two = blockchain.insert_block(two, StateDiff::default()).unwrap();

        let last_block_difficulty = blockchain
            .total_difficulty_by_hash(last_block.hash())
            .unwrap()
            .expect("total difficulty must exist");

        assert_eq!(
            blockchain
                .total_difficulty_by_hash(one.block.hash())
                .unwrap(),
            Some(last_block_difficulty + one.block.header().difficulty)
        );

        assert_eq!(
            blockchain
                .total_difficulty_by_hash(two.block.hash())
                .unwrap(),
            Some(
                last_block_difficulty
                    + one.block.header().difficulty
                    + two.block.header().difficulty
            )
        );

        blockchain
            .revert_to_block(one.block.header().number)
            .unwrap();

        // Block 1 has a total difficulty
        assert_eq!(
            blockchain
                .total_difficulty_by_hash(one.block.hash())
                .unwrap(),
            Some(last_block_difficulty + one.block.header().difficulty)
        );

        // Block 2 no longer stores a total difficulty
        assert!(blockchain
            .total_difficulty_by_hash(two.block.hash())
            .unwrap()
            .is_none());
    }
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn block_total_difficulty_by_hash_invalid_hash() {
    let blockchains = create_dummy_blockchains().await;

    for blockchain in blockchains {
        let difficulty = blockchain.total_difficulty_by_hash(&B256::ZERO).unwrap();

        assert!(difficulty.is_none());
    }
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn block_by_transaction_hash_local() -> anyhow::Result<()> {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let previous_block_number = blockchain.last_block_number();

        let DummyBlockAndTransaction {
            block: mined_block,
            transaction_hash,
            ..
        } = insert_dummy_block_with_transaction(blockchain.as_mut())?;
        let block = blockchain.block_by_transaction_hash(&transaction_hash)?;

        assert!(block.is_some());

        let block = block.unwrap();
        assert!(Arc::ptr_eq(&block, &mined_block));

        let transactions = block.transactions();
        assert_eq!(transactions.len(), 1);
        assert_eq!(*transactions[0].hash(), transaction_hash);

        blockchain.revert_to_block(previous_block_number)?;

        // Once reverted, the block is no longer available
        let block = blockchain.block_by_transaction_hash(&transaction_hash)?;
        assert!(block.is_none());
    }

    Ok(())
}

#[cfg(feature = "test-remote")]
#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn block_by_transaction_hash_remote() -> anyhow::Result<()> {
    use std::str::FromStr;

    let blockchain = create_forked_dummy_blockchain(None).await;

    let block = blockchain
        .block_by_transaction_hash(&B256::from_str(REMOTE_BLOCK_FIRST_TRANSACTION_HASH)?)?;

    assert!(block.is_some());
    let block = block.unwrap();

    assert_eq!(block.hash(), &B256::from_str(REMOTE_BLOCK_HASH)?);

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn block_by_transaction_hash_unknown() -> anyhow::Result<()> {
    let blockchains = create_dummy_blockchains().await;

    for blockchain in blockchains {
        let transaction = dummy_eip155_transaction(Address::random(), 0)?;

        let block = blockchain.block_by_transaction_hash(transaction.hash())?;
        assert!(block.is_none());
    }

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn receipt_by_transaction_hash_local() -> anyhow::Result<()> {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let previous_block_number = blockchain.last_block_number();

        let DummyBlockAndTransaction {
            transaction_hash,
            transaction_receipt,
            ..
        } = insert_dummy_block_with_transaction(blockchain.as_mut())?;
        let receipt = blockchain.receipt_by_transaction_hash(&transaction_hash)?;

        assert!(receipt.is_some());

        let receipt = receipt.unwrap();
        assert_eq!(
            receipt.transaction_hash,
            transaction_receipt.transaction_hash
        );
        assert_eq!(
            receipt.transaction_index,
            transaction_receipt.transaction_index
        );
        assert_eq!(receipt.from, transaction_receipt.from);
        assert_eq!(receipt.to, transaction_receipt.to);
        assert_eq!(
            receipt.contract_address,
            transaction_receipt.contract_address
        );
        assert_eq!(receipt.gas_used, transaction_receipt.gas_used);
        assert_eq!(
            receipt.effective_gas_price,
            transaction_receipt.effective_gas_price
        );

        blockchain.revert_to_block(previous_block_number)?;

        // Once reverted, the receipt is no longer available
        let receipt = blockchain.receipt_by_transaction_hash(&transaction_hash)?;
        assert!(receipt.is_none());
    }

    Ok(())
}

#[cfg(feature = "test-remote")]
#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn receipt_by_transaction_hash_remote() -> anyhow::Result<()> {
    use std::str::FromStr;

    let blockchain = create_forked_dummy_blockchain(None).await;

    let transaction_hash = B256::from_str(REMOTE_BLOCK_FIRST_TRANSACTION_HASH)?;
    let receipt = blockchain.receipt_by_transaction_hash(&transaction_hash)?;

    assert!(receipt.is_some());

    let receipt = receipt.unwrap();
    assert_eq!(receipt.transaction_hash, transaction_hash);
    assert_eq!(receipt.block_hash, B256::from_str(REMOTE_BLOCK_HASH)?);

    Ok(())
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn receipt_by_transaction_hash_unknown() -> anyhow::Result<()> {
    let blockchains = create_dummy_blockchains().await;

    for blockchain in blockchains {
        let transaction = dummy_eip155_transaction(Address::random(), 0)?;

        let receipt = blockchain.receipt_by_transaction_hash(transaction.hash())?;
        assert!(receipt.is_none());
    }

    Ok(())
}

#[cfg(feature = "test-remote")]
#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn state_at_block_number_historic() {
    use edr_evm::state::IrregularState;

    let blockchain = create_forked_dummy_blockchain(None).await;
    let irregular_state = IrregularState::default();

    let genesis_block = blockchain
        .block_by_number(0)
        .expect("Failed to retrieve block")
        .expect("Block should exist");

    let state = blockchain
        .state_at_block_number(0, irregular_state.state_overrides())
        .unwrap();
    assert_eq!(
        state.state_root().expect("State root should be returned"),
        genesis_block.header().state_root
    );
}
