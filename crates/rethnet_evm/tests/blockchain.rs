use std::str::FromStr;

use serial_test::serial;

use lazy_static::lazy_static;
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
use tempfile::TempDir;

lazy_static! {
    // Use same cache dir for all tests
    static ref CACHE_DIR: TempDir = TempDir::new().unwrap();
}

// The cache directory is only used when the `test-remote` feature is enabled
#[allow(unused_variables)]
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

    #[cfg(feature = "test-remote")]
    let forked_blockchain = {
        use rethnet_evm::blockchain::ForkedBlockchain;
        use rethnet_test_utils::env::get_alchemy_url;

        let cache_dir = CACHE_DIR.path().into();

        ForkedBlockchain::new(
            tokio::runtime::Handle::current().clone(),
            SpecId::LATEST,
            &get_alchemy_url(),
            cache_dir,
            None,
        )
        .await
        .expect("Failed to construct forked blockchain")
    };

    vec![
        Box::new(local_blockchain),
        #[cfg(feature = "test-remote")]
        Box::new(forked_blockchain),
    ]
}

async fn create_dummy_block(blockchain: &dyn SyncBlockchain<BlockchainError>) -> DetailedBlock {
    let block_number = blockchain.last_block_number().await + U256::from(1);

    create_dummy_block_with_number(blockchain, block_number).await
}

async fn create_dummy_block_with_number(
    blockchain: &dyn SyncBlockchain<BlockchainError>,
    number: U256,
) -> DetailedBlock {
    let parent_hash = *blockchain
        .last_block()
        .await
        .expect("Failed to retrieve last block")
        .hash();

    create_dummy_block_with_hash(number, parent_hash)
}

async fn create_dummy_block_with_difficulty(
    blockchain: &dyn SyncBlockchain<BlockchainError>,
    number: U256,
    difficulty: u64,
) -> DetailedBlock {
    let parent_hash = *blockchain
        .last_block()
        .await
        .expect("Failed to retrieve last block")
        .hash();

    create_dummy_block_with_header(PartialHeader {
        number,
        parent_hash,
        difficulty: U256::from(difficulty),
        ..PartialHeader::default()
    })
}

fn create_dummy_block_with_hash(number: U256, parent_hash: B256) -> DetailedBlock {
    create_dummy_block_with_header(PartialHeader {
        parent_hash,
        number,
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

    SignedTransaction::PostEip155Legacy(transaction.sign(&private_key))
}

#[tokio::test]
#[serial]
async fn test_get_last_block() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let next_block = create_dummy_block(blockchain.as_ref()).await;
        let expected = blockchain
            .insert_block(next_block)
            .await
            .expect("Failed to insert block");

        assert_eq!(blockchain.last_block().await.unwrap(), expected);
    }
}

#[tokio::test]
#[serial]
async fn test_get_block_by_hash_some() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let next_block = create_dummy_block(blockchain.as_ref()).await;
        let expected = blockchain
            .insert_block(next_block)
            .await
            .expect("Failed to insert block");

        assert_eq!(
            blockchain.block_by_hash(expected.hash()).await.unwrap(),
            Some(expected)
        );
    }
}

#[tokio::test]
#[serial]
async fn test_get_block_by_hash_none() {
    let blockchains = create_dummy_blockchains().await;

    for blockchain in blockchains {
        assert_eq!(blockchain.block_by_hash(&B256::zero()).await.unwrap(), None);
    }
}

#[tokio::test]
#[serial]
async fn test_get_block_by_number_some() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let next_block = create_dummy_block(blockchain.as_ref()).await;
        let expected = blockchain
            .insert_block(next_block)
            .await
            .expect("Failed to insert block");

        assert_eq!(
            blockchain
                .block_by_number(&expected.header.number)
                .await
                .unwrap(),
            Some(expected),
        );
    }
}

#[tokio::test]
#[serial]
async fn test_get_block_by_number_none() {
    let blockchains = create_dummy_blockchains().await;

    for blockchain in blockchains {
        let next_block_number = blockchain.last_block_number().await + U256::from(1);
        assert_eq!(
            blockchain
                .block_by_number(&next_block_number)
                .await
                .unwrap(),
            None
        );
    }
}

#[tokio::test]
#[serial]
async fn test_insert_block_multiple() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let one = create_dummy_block(blockchain.as_ref()).await;
        let one = blockchain.insert_block(one).await.unwrap();

        let two = create_dummy_block(blockchain.as_ref()).await;
        let two = blockchain.insert_block(two).await.unwrap();

        assert_eq!(
            blockchain
                .block_by_number(&one.header.number)
                .await
                .unwrap(),
            Some(one)
        );
        assert_eq!(
            blockchain
                .block_by_number(&two.header.number)
                .await
                .unwrap(),
            Some(two)
        );
    }
}

#[tokio::test]
#[serial]
async fn test_insert_block_invalid_block_number() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let next_block_number = blockchain.last_block_number().await + U256::from(1);
        let invalid_block_number = next_block_number + U256::from(1);

        let invalid_block =
            create_dummy_block_with_number(blockchain.as_ref(), invalid_block_number).await;
        let error = blockchain
            .insert_block(invalid_block)
            .await
            .expect_err("Should fail to insert block");

        if let BlockchainError::InvalidBlockNumber { actual, expected } = error {
            assert_eq!(actual, U256::from(invalid_block_number));
            assert_eq!(expected, U256::from(next_block_number));
        } else {
            panic!("Unexpected error: {error:?}");
        }
    }
}

#[tokio::test]
#[serial]
async fn test_insert_block_invalid_parent_hash() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        const INVALID_BLOCK_HASH: B256 = B256::zero();
        let next_block_number = blockchain.last_block_number().await + U256::from(1);

        let one = create_dummy_block_with_hash(next_block_number, INVALID_BLOCK_HASH);
        let error = blockchain
            .insert_block(one)
            .await
            .expect_err("Should fail to insert block");

        if let BlockchainError::InvalidParentHash { actual, expected } = error {
            assert_eq!(actual, INVALID_BLOCK_HASH);
            assert_eq!(expected, *blockchain.last_block().await.unwrap().hash());
        } else {
            panic!("Unexpected error: {error:?}");
        }
    }
}

#[tokio::test]
#[serial]
async fn test_revert_to_block() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let last_block = blockchain.last_block().await.unwrap();

        let one = create_dummy_block(blockchain.as_ref()).await;
        let one = blockchain.insert_block(one).await.unwrap();

        let two = create_dummy_block(blockchain.as_ref()).await;
        let two = blockchain.insert_block(two).await.unwrap();

        blockchain
            .revert_to_block(&last_block.header.number)
            .await
            .unwrap();

        // Last block still exists
        assert_eq!(blockchain.last_block().await.unwrap(), last_block);

        assert_eq!(
            blockchain.block_by_hash(last_block.hash()).await.unwrap(),
            Some(last_block)
        );

        // Blocks 1 and 2 are gone
        assert!(blockchain
            .block_by_number(&one.header.number)
            .await
            .unwrap()
            .is_none());

        assert!(blockchain
            .block_by_number(&two.header.number)
            .await
            .unwrap()
            .is_none());

        assert!(blockchain
            .block_by_hash(one.hash())
            .await
            .unwrap()
            .is_none());
        assert!(blockchain
            .block_by_hash(two.hash())
            .await
            .unwrap()
            .is_none());

        // Add block 1 again
        let one = blockchain.insert_block((*one).clone()).await.unwrap();

        assert_eq!(
            blockchain.block_by_hash(one.hash()).await.unwrap(),
            Some(one)
        );
    }
}

#[tokio::test]
#[serial]
async fn test_revert_to_block_invalid_number() {
    let blockchains = create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let next_block_number = blockchain.last_block_number().await + U256::from(1);
        let error = blockchain
            .revert_to_block(&next_block_number)
            .await
            .expect_err("Should fail to insert block");

        if let BlockchainError::UnknownBlockNumber = error {
        } else {
            panic!("Unexpected error: {error:?}");
        }
    }
}

#[tokio::test]
#[serial]
async fn test_block_total_difficulty_by_hash() {
    let blockchains: Vec<Box<dyn SyncBlockchain<BlockchainError>>> =
        create_dummy_blockchains().await;

    for mut blockchain in blockchains {
        let last_block = blockchain.last_block().await.unwrap();

        let one = create_dummy_block_with_difficulty(
            blockchain.as_ref(),
            last_block.header.number + U256::from(1),
            1000,
        )
        .await;
        let one = blockchain.insert_block(one).await.unwrap();

        let two = create_dummy_block_with_difficulty(
            blockchain.as_ref(),
            last_block.header.number + U256::from(2),
            2000,
        )
        .await;
        let two = blockchain.insert_block(two).await.unwrap();

        let last_block_difficulty = blockchain
            .total_difficulty_by_hash(last_block.hash())
            .await
            .unwrap()
            .expect("total difficulty must exist");

        assert_eq!(
            blockchain
                .total_difficulty_by_hash(one.hash())
                .await
                .unwrap(),
            Some(last_block_difficulty + one.header.difficulty)
        );

        assert_eq!(
            blockchain
                .total_difficulty_by_hash(two.hash())
                .await
                .unwrap(),
            Some(last_block_difficulty + one.header.difficulty + two.header.difficulty)
        );

        blockchain
            .revert_to_block(&one.header.number)
            .await
            .unwrap();

        // Block 1 has a total difficulty
        assert_eq!(
            blockchain
                .total_difficulty_by_hash(one.hash())
                .await
                .unwrap(),
            Some(last_block_difficulty + one.header.difficulty)
        );

        // Block 2 no longer stores a total difficulty
        assert!(blockchain
            .total_difficulty_by_hash(two.hash())
            .await
            .unwrap()
            .is_none());
    }
}

#[tokio::test]
#[serial]
async fn test_block_total_difficulty_by_hash_invalid_hash() {
    let blockchains = create_dummy_blockchains().await;

    for blockchain in blockchains {
        let difficulty = blockchain
            .total_difficulty_by_hash(&B256::zero())
            .await
            .unwrap();

        assert!(difficulty.is_none());
    }
}

#[tokio::test]
#[serial]
async fn test_transaction_by_hash() {
    let blockchains = create_dummy_blockchains().await;

    for blockchain in blockchains {
        let transaction = create_dummy_transaction();

        let block = blockchain
            .block_by_transaction_hash(&transaction.hash())
            .await
            .unwrap();

        assert!(block.is_none());
    }
}
