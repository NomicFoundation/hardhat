use std::str::FromStr;

use edr_eth::{
    block::{BlobGas, PartialHeader},
    transaction::{Eip155TransactionRequest, SignedTransaction, TransactionKind},
    trie::KECCAK_NULL_RLP,
    Address, Bytes, B256, U256,
};
use edr_evm::{
    blockchain::{BlockchainError, LocalBlockchain, SyncBlockchain},
    state::{StateDiff, StateError},
    LocalBlock, SpecId,
};
use lazy_static::lazy_static;
use serial_test::serial;
use tempfile::TempDir;

lazy_static! {
    // Use same cache dir for all tests
    static ref CACHE_DIR: TempDir = TempDir::new().unwrap();
}

#[cfg(feature = "test-remote")]
async fn create_forked_dummy_blockchain() -> Box<dyn SyncBlockchain<BlockchainError, StateError>> {
    use std::sync::Arc;

    use edr_eth::remote::RpcClient;
    use edr_evm::{blockchain::ForkedBlockchain, HashMap, RandomHashGenerator};
    use edr_test_utils::env::get_alchemy_url;
    use parking_lot::Mutex;

    let cache_dir = CACHE_DIR.path().into();
    let rpc_client = RpcClient::new(&get_alchemy_url(), cache_dir);

    Box::new(
        ForkedBlockchain::new(
            tokio::runtime::Handle::current().clone(),
            None,
            SpecId::LATEST,
            rpc_client,
            None,
            Arc::new(Mutex::new(RandomHashGenerator::with_seed(
                edr_defaults::STATE_ROOT_HASH_SEED,
            ))),
            HashMap::new(),
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
        DEFAULT_GAS_LIMIT,
        None,
        Some(B256::ZERO),
        Some(U256::from(DEFAULT_INITIAL_BASE_FEE)),
        Some(BlobGas {
            gas_used: 0,
            excess_gas: 0,
        }),
        Some(KECCAK_NULL_RLP),
    )
    .expect("Should construct without issues");

    vec![
        Box::new(local_blockchain),
        #[cfg(feature = "test-remote")]
        create_forked_dummy_blockchain().await,
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
            withdrawals_root: Some(KECCAK_NULL_RLP),
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
            withdrawals_root: Some(KECCAK_NULL_RLP),
            ..PartialHeader::default()
        },
    )
}

fn create_dummy_block_with_header(spec_id: SpecId, partial_header: PartialHeader) -> LocalBlock {
    LocalBlock::empty(spec_id, partial_header)
}

fn create_dummy_transaction() -> SignedTransaction {
    const DUMMY_INPUT: &[u8] = b"124";

    // TODO: Consolidate DEFAULT_SECRET_KEYS in a centralised place
    // these were taken from the standard output of a run of `hardhat node`
    const DUMMY_SECRET_KEY: &str =
        "e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109";

    let to = Address::from_str("0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e")
        .expect("default value should be known to succeed");

    let transaction = Eip155TransactionRequest {
        nonce: 0,
        gas_price: U256::ZERO,
        gas_limit: 0,
        kind: TransactionKind::Call(to),
        value: U256::from(0),
        input: Bytes::from(DUMMY_INPUT),
        chain_id: 1,
    };

    let secret_key = edr_eth::signature::secret_key_from_str(DUMMY_SECRET_KEY)
        .expect("Failed to parse secret key");

    SignedTransaction::PostEip155Legacy(transaction.sign(&secret_key).expect("signs transaction"))
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn get_last_block() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let next_block = create_dummy_block(blockchain.as_ref());
        let expected = blockchain
            .insert_block(next_block, StateDiff::default())
            .expect("Failed to insert block");

        assert_eq!(
            blockchain.last_block().unwrap().hash(),
            expected.block.hash()
        );
    }
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn get_block_by_hash_some() {
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
async fn get_block_by_hash_none() {
    let blockchains = create_dummy_blockchains().await;

    for blockchain in blockchains {
        assert!(blockchain.block_by_hash(&B256::ZERO).unwrap().is_none());
    }
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn get_block_by_number_some() {
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

#[tokio::test]
#[serial]
async fn get_block_by_number_none() {
    let blockchains = create_dummy_blockchains().await;

    for blockchain in blockchains {
        let next_block_number = blockchain.last_block_number() + 1;
        assert!(blockchain
            .block_by_number(next_block_number)
            .unwrap()
            .is_none());
    }
}

#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn insert_block_multiple() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let one = create_dummy_block(blockchain.as_ref());
        let one = blockchain.insert_block(one, StateDiff::default()).unwrap();

        let two = create_dummy_block(blockchain.as_ref());
        let two = blockchain.insert_block(two, StateDiff::default()).unwrap();

        assert_eq!(
            blockchain
                .block_by_number(one.block.header().number)
                .unwrap()
                .unwrap()
                .hash(),
            one.block.hash()
        );
        assert_eq!(
            blockchain
                .block_by_number(two.block.header().number)
                .unwrap()
                .unwrap()
                .hash(),
            two.block.hash()
        );
    }
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
async fn revert_to_block() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let last_block = blockchain.last_block().unwrap();

        let one = create_dummy_block(blockchain.as_ref());
        let one = blockchain.insert_block(one, StateDiff::default()).unwrap();

        let two = create_dummy_block(blockchain.as_ref());
        let two = blockchain.insert_block(two, StateDiff::default()).unwrap();

        blockchain
            .revert_to_block(last_block.header().number)
            .unwrap();

        // Last block still exists
        assert_eq!(blockchain.last_block().unwrap().hash(), last_block.hash());

        assert_eq!(
            blockchain
                .block_by_hash(last_block.hash())
                .unwrap()
                .unwrap()
                .hash(),
            last_block.hash()
        );

        // Blocks 1 and 2 are gone
        assert!(blockchain
            .block_by_number(one.block.header().number)
            .unwrap()
            .is_none());

        assert!(blockchain
            .block_by_number(two.block.header().number)
            .unwrap()
            .is_none());

        assert!(blockchain
            .block_by_hash(one.block.hash())
            .unwrap()
            .is_none());
        assert!(blockchain
            .block_by_hash(two.block.hash())
            .unwrap()
            .is_none());
    }
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

        if let BlockchainError::UnknownBlockNumber = error {
        } else {
            panic!("Unexpected error: {error:?}");
        }
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
async fn transaction_by_hash() {
    let blockchains = create_dummy_blockchains().await;

    for blockchain in blockchains {
        let transaction = create_dummy_transaction();

        let block = blockchain
            .block_by_transaction_hash(transaction.hash())
            .unwrap();

        assert!(block.is_none());
    }
}

#[cfg(feature = "test-remote")]
#[tokio::test(flavor = "multi_thread")]
#[serial]
async fn state_at_block_number_historic() {
    use edr_evm::state::IrregularState;

    let blockchain = create_forked_dummy_blockchain().await;
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
