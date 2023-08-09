use std::str::FromStr;

use rethnet_eth::{
    block::{Block, DetailedBlock, PartialHeader},
    transaction::{EIP155TransactionRequest, SignedTransaction, TransactionKind},
    Address, Bytes, B256, U256,
};
use rethnet_evm::{
    blockchain::{BlockchainError, LocalBlockchain, SyncBlockchain},
    state::HybridState,
    SpecId,
};

async fn create_dummy_blockchains() -> Vec<Box<dyn SyncBlockchain<BlockchainError>>> {
    const DEFAULT_GAS_LIMIT: u64 = 0xffffffffffffff;
    const DEFAULT_INITIAL_BASE_FEE: u64 = 1000000000;

    let state = HybridState::default();

    let local_blockchain = LocalBlockchain::new(
        &state,
        U256::from(1),
        SpecId::LATEST,
        U256::from(DEFAULT_GAS_LIMIT),
        None,
        Some(B256::zero()),
        Some(U256::from(DEFAULT_INITIAL_BASE_FEE)),
    )
    .expect("Should construct without issues");

    // TODO: enable forked blockchain once hashing of transactions works properly
    // let runtime = Builder::new_multi_thread().enable_all().build().unwrap();
    // let forked_blockchain =
    //     ForkedBlockchain::new(Arc::new(runtime), SpecId::LATEST, &get_alchemy_url(), None)
    //         .await
    //         .expect("Failed to construct forked blockchain");

    vec![
        Box::new(local_blockchain), // , Box::new(forked_blockchain)
    ]
}

fn create_dummy_block(
    blockchain: &dyn SyncBlockchain<BlockchainError>,
    number: u64,
) -> DetailedBlock {
    let parent_hash = *blockchain
        .last_block()
        .expect("Failed to retrieve last block")
        .hash();

    create_dummy_block_with_hash(number, parent_hash)
}

fn create_dummy_block_with_difficulty(
    blockchain: &dyn SyncBlockchain<BlockchainError>,
    number: u64,
    difficulty: u64,
) -> DetailedBlock {
    let parent_hash = *blockchain
        .last_block()
        .expect("Failed to retrieve last block")
        .hash();

    create_dummy_block_with_header(PartialHeader {
        number: U256::from(number),
        parent_hash,
        difficulty: U256::from(difficulty),
        ..PartialHeader::default()
    })
}

fn create_dummy_block_with_hash(number: u64, parent_hash: B256) -> DetailedBlock {
    create_dummy_block_with_header(PartialHeader {
        number: U256::from(number),
        parent_hash,
        ..PartialHeader::default()
    })
}

fn create_dummy_block_with_header(header: PartialHeader) -> DetailedBlock {
    let block = Block::new(header, Vec::new(), Vec::new(), Some(Vec::new()));

    DetailedBlock::new(block, Vec::new(), Vec::new())
}

fn create_dummy_transaction() -> SignedTransaction {
    const DUMMY_INPUT: &[u8] = b"124";

    // TODO: Consolidate DEFAULT_PRIVATE_KEYS in a centralised place
    // these were taken from the standard output of a run of `hardhat node`
    const DUMMY_PRIVATE_KEY: &str =
        "e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109";

    let to = Address::from_str("0xc014ba5ec014ba5ec014ba5ec014ba5ec014ba5e")
        .expect("default value should be known to succeed");

    let transaction = EIP155TransactionRequest {
        nonce: 0,
        gas_price: U256::ZERO,
        gas_limit: 0,
        kind: TransactionKind::Call(to),
        value: U256::from(0),
        input: Bytes::from(DUMMY_INPUT),
        chain_id: 1,
    };

    let private_key = rethnet_eth::secp256k1::SecretKey::from_str(DUMMY_PRIVATE_KEY)
        .expect("Failed to parse private key");

    SignedTransaction::EIP155(transaction.sign(&private_key))
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn test_get_last_block() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let one = create_dummy_block(blockchain.as_ref(), 1);
        let one = blockchain
            .insert_block(one)
            .expect("Failed to insert block");

        assert_eq!(blockchain.last_block().unwrap(), one);
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn test_get_block_by_hash_some() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let one = create_dummy_block(blockchain.as_ref(), 1);
        let one = blockchain
            .insert_block(one)
            .expect("Failed to insert block");

        assert_eq!(blockchain.block_by_hash(one.hash()).unwrap(), Some(one));
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn test_get_block_by_hash_none() {
    let blockchains = create_dummy_blockchains().await;

    for blockchain in blockchains {
        assert_eq!(blockchain.block_by_hash(&B256::zero()).unwrap(), None);
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn test_get_block_by_number_some() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let one = create_dummy_block(blockchain.as_ref(), 1);
        let one = blockchain
            .insert_block(one)
            .expect("Failed to insert block");

        assert_eq!(
            blockchain.block_by_number(&one.header.number).unwrap(),
            Some(one)
        );
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn test_get_block_by_number_none() {
    let blockchains = create_dummy_blockchains().await;

    for blockchain in blockchains {
        assert_eq!(blockchain.block_by_number(&U256::from(1)).unwrap(), None);
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn test_insert_block_multiple() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let one = create_dummy_block(blockchain.as_ref(), 1);
        let one = blockchain.insert_block(one).unwrap();

        let two = create_dummy_block(blockchain.as_ref(), 2);
        let two = blockchain.insert_block(two).unwrap();

        assert_eq!(
            blockchain.block_by_number(&U256::from(1)).unwrap(),
            Some(one)
        );
        assert_eq!(
            blockchain.block_by_number(&U256::from(2)).unwrap(),
            Some(two)
        );
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn test_insert_block_invalid_block_number() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        const INVALID_BLOCK_NUMBER: u64 = 2;

        let two = create_dummy_block(blockchain.as_ref(), INVALID_BLOCK_NUMBER);
        let error = blockchain
            .insert_block(two)
            .expect_err("Should fail to insert block");

        if let BlockchainError::InvalidBlockNumber { actual, expected } = error {
            assert_eq!(actual, U256::from(INVALID_BLOCK_NUMBER));
            assert_eq!(expected, U256::from(1));
        } else {
            panic!("Unexpected error: {:?}", error);
        }
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn test_insert_block_invalid_parent_hash() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        const INVALID_BLOCK_HASH: B256 = B256::zero();

        let one = create_dummy_block_with_hash(1, INVALID_BLOCK_HASH);
        let error = blockchain
            .insert_block(one)
            .expect_err("Should fail to insert block");

        if let BlockchainError::InvalidParentHash { actual, expected } = error {
            assert_eq!(actual, INVALID_BLOCK_HASH);
            assert_eq!(expected, *blockchain.last_block().unwrap().hash());
        } else {
            panic!("Unexpected error: {:?}", error);
        }
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn test_revert_to_block() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let genesis = blockchain.last_block().unwrap();

        let one = create_dummy_block(blockchain.as_ref(), 1);
        let one = blockchain.insert_block(one).unwrap();

        let two = create_dummy_block(blockchain.as_ref(), 2);
        let two = blockchain.insert_block(two).unwrap();

        blockchain.revert_to_block(&genesis.header.number).unwrap();

        // Genesis block still exists
        assert_eq!(blockchain.last_block().unwrap(), genesis);

        assert_eq!(
            blockchain.block_by_hash(genesis.hash()).unwrap(),
            Some(genesis)
        );

        // Blocks 1 and 2 are gone
        assert!(blockchain
            .block_by_number(&U256::from(1))
            .unwrap()
            .is_none());

        assert!(blockchain
            .block_by_number(&U256::from(2))
            .unwrap()
            .is_none());

        assert!(blockchain.block_by_hash(one.hash()).unwrap().is_none());
        assert!(blockchain.block_by_hash(two.hash()).unwrap().is_none());

        // Add block 1 again
        let one = blockchain.insert_block((*one).clone()).unwrap();

        assert_eq!(blockchain.block_by_hash(one.hash()).unwrap(), Some(one));
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn test_revert_to_block_invalid_number() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let error = blockchain
            .revert_to_block(&U256::from(1))
            .expect_err("Should fail to insert block");

        if let BlockchainError::UnknownBlockNumber = error {
        } else {
            panic!("Unexpected error: {:?}", error);
        }
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn test_block_total_difficulty_by_hash() {
    let blockchains: Vec<Box<dyn SyncBlockchain<BlockchainError>>> =
        create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let genesis = blockchain.last_block().unwrap();

        let one = create_dummy_block_with_difficulty(blockchain.as_ref(), 1, 1000);
        let one = blockchain.insert_block(one).unwrap();

        let two = create_dummy_block_with_difficulty(blockchain.as_ref(), 2, 2000);
        let two = blockchain.insert_block(two).unwrap();

        assert_eq!(
            blockchain.total_difficulty_by_hash(genesis.hash()).unwrap(),
            Some(U256::ZERO)
        );
        assert_eq!(
            blockchain.total_difficulty_by_hash(one.hash()).unwrap(),
            Some(one.header.difficulty)
        );
        assert_eq!(
            blockchain.total_difficulty_by_hash(two.hash()).unwrap(),
            Some(one.header.difficulty + two.header.difficulty)
        );

        blockchain.revert_to_block(&one.header.number).unwrap();

        // Block 1 has a total difficulty
        assert_eq!(
            blockchain.total_difficulty_by_hash(one.hash()).unwrap(),
            Some(one.header.difficulty)
        );

        // Block 2 no longer stores a total difficulty
        assert!(blockchain
            .total_difficulty_by_hash(two.hash())
            .unwrap()
            .is_none());
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn test_block_total_difficulty_by_hash_invalid_hash() {
    let blockchains = create_dummy_blockchains().await;

    for blockchain in blockchains {
        let difficulty = blockchain.total_difficulty_by_hash(&B256::zero()).unwrap();

        assert!(difficulty.is_none());
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
async fn test_transaction_by_hash() {
    let blockchains = create_dummy_blockchains().await;

    for blockchain in blockchains {
        let transaction = create_dummy_transaction();

        let block = blockchain
            .block_by_transaction_hash(&transaction.hash())
            .unwrap();

        assert!(block.is_none());
    }
}
