#![cfg(feature = "test-utils")]

use edr_eth::{AccountInfo, Address, U256};
use edr_evm::{
    state::{AccountModifierFn, StateDebug},
    test_utils::{
        dummy_eip1559_transaction, dummy_eip155_transaction, dummy_eip155_transaction_with_limit,
        dummy_eip155_transaction_with_price, dummy_eip155_transaction_with_price_limit_and_value,
        MemPoolTestFixture,
    },
    MemPoolAddTransactionError, OrderedTransaction,
};

#[test]
fn has_future_transactions() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);
    assert!(!fixture.mem_pool.has_future_transactions());

    let transaction = dummy_eip155_transaction(sender, 1)?;
    fixture.add_transaction(transaction)?;
    assert!(fixture.mem_pool.has_future_transactions());
    assert!(!fixture.mem_pool.has_pending_transactions());

    Ok(())
}

#[test]
fn has_pending_transactions() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);
    assert!(!fixture.mem_pool.has_pending_transactions());

    let transaction = dummy_eip155_transaction(sender, 0)?;
    fixture.add_transaction(transaction)?;
    assert!(fixture.mem_pool.has_pending_transactions());
    assert!(!fixture.mem_pool.has_future_transactions());

    Ok(())
}

#[test]
fn single_sender_adds_transaction_nonce_equal() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let transaction = dummy_eip155_transaction(sender, 0)?;
    fixture.add_transaction(transaction.clone())?;

    let pending_transactions = fixture.mem_pool.pending_transactions().collect::<Vec<_>>();
    assert_eq!(pending_transactions.len(), 1);
    assert_eq!(*pending_transactions[0].pending(), transaction);

    Ok(())
}

#[test]
fn single_sender_adds_transaction_nonce_too_high() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let transaction = dummy_eip155_transaction(sender, 3)?;
    fixture.add_transaction(transaction.clone())?;

    let pending_transactions = fixture.mem_pool.pending_transactions().collect::<Vec<_>>();
    assert_eq!(pending_transactions.len(), 0);

    let future_transactions = fixture.mem_pool.future_transactions().collect::<Vec<_>>();
    assert_eq!(future_transactions.len(), 1);
    assert_eq!(*future_transactions[0].pending(), transaction);

    Ok(())
}

#[test]
fn single_sender_adds_multiple_transactions_nonce_equal() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let transaction1 = dummy_eip155_transaction(sender, 0)?;
    fixture.add_transaction(transaction1.clone())?;

    let transaction2 = dummy_eip155_transaction(sender, 1)?;
    fixture.add_transaction(transaction2.clone())?;

    let pending_transactions = fixture.mem_pool.pending_transactions().collect::<Vec<_>>();
    assert_eq!(pending_transactions.len(), 2);
    assert_eq!(*pending_transactions[0].pending(), transaction1);
    assert_eq!(*pending_transactions[1].pending(), transaction2);

    Ok(())
}

#[test]
fn single_sender_adds_multiple_transactions_moves_future_to_pending() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let transaction1 = dummy_eip155_transaction(sender, 1)?;
    fixture.add_transaction(transaction1.clone())?;

    let transaction2 = dummy_eip155_transaction(sender, 3)?;
    fixture.add_transaction(transaction2.clone())?;

    let transaction3 = dummy_eip155_transaction(sender, 0)?;
    fixture.add_transaction(transaction3.clone())?;

    let pending_transactions = fixture.mem_pool.pending_transactions().collect::<Vec<_>>();
    assert_eq!(pending_transactions.len(), 2);
    assert_eq!(*pending_transactions[0].pending(), transaction3);
    assert_eq!(*pending_transactions[1].pending(), transaction1);

    let future_transactions = fixture.mem_pool.future_transactions().collect::<Vec<_>>();
    assert_eq!(future_transactions.len(), 1);
    assert_eq!(*future_transactions[0].pending(), transaction2);

    Ok(())
}

#[test]
fn replace_pending_transaction() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(
        sender,
        AccountInfo {
            balance: U256::from(10_000_000u64),
            ..AccountInfo::default()
        },
    )]);

    let transaction1 = dummy_eip155_transaction_with_price(sender, 0, U256::from(5))?;
    fixture.add_transaction(transaction1.clone())?;

    let transaction2 = dummy_eip155_transaction_with_price(sender, 0, U256::from(10))?;
    fixture.add_transaction(transaction2.clone())?;

    let pending_transactions = fixture.mem_pool.pending_transactions().collect::<Vec<_>>();
    assert_eq!(pending_transactions.len(), 1);
    assert_eq!(*pending_transactions[0].pending(), transaction2);

    Ok(())
}

#[test]
fn replace_future_transaction() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(
        sender,
        AccountInfo {
            balance: U256::from(10_000_000u64),
            ..AccountInfo::default()
        },
    )]);

    let transaction1 = dummy_eip155_transaction_with_price(sender, 1, U256::from(5))?;
    fixture.add_transaction(transaction1.clone())?;

    let transaction2 = dummy_eip155_transaction_with_price(sender, 1, U256::from(10))?;
    fixture.add_transaction(transaction2.clone())?;

    let future_transactions = fixture.mem_pool.future_transactions().collect::<Vec<_>>();
    assert_eq!(future_transactions.len(), 1);
    assert_eq!(*future_transactions[0].pending(), transaction2);

    Ok(())
}

macro_rules! impl_test_replace_transaction_gas_price_too_low {
    ($($name:ident => $nonce:expr,)+) => {
        $(
            paste::item! {
                #[test]
                fn [<replace_ $name _gas_price_too_low>]() -> anyhow::Result<()> {
                    let sender = Address::random();
                    let mut fixture = MemPoolTestFixture::with_accounts(&[(
                        sender,
                        AccountInfo {
                            balance: U256::from(10_000_000u64),
                            ..AccountInfo::default()
                        },
                    )]);

                    let transaction1 = dummy_eip155_transaction_with_price(sender, $nonce, U256::from(20))?;
                    fixture.add_transaction(transaction1.clone())?;

                    let transaction2 = dummy_eip155_transaction_with_price(sender, $nonce, U256::from(21))?;
                    let result = fixture.add_transaction(transaction2);

                    assert!(matches!(
                        result,
                        Err(MemPoolAddTransactionError::ReplacementMaxFeePerGasTooLow {
                            min_new_max_fee_per_gas,
                            transaction_nonce: $nonce,
                        }) if min_new_max_fee_per_gas == U256::from(22)
                    ));

                    assert_eq!(
                        result.unwrap_err().to_string(),
                        format!(
                            "Replacement transaction underpriced. A gasPrice/maxFeePerGas of at least 22 is necessary to replace the existing transaction with nonce {}.",
                            $nonce,
                        )
                    );

                    let transaction3 = dummy_eip1559_transaction(sender, $nonce, U256::from(21), U256::from(21))?;
                    let result = fixture.add_transaction(transaction3);

                    assert!(matches!(
                        result,
                        Err(MemPoolAddTransactionError::ReplacementMaxFeePerGasTooLow {
                            min_new_max_fee_per_gas,
                            transaction_nonce: $nonce,
                        }) if min_new_max_fee_per_gas == U256::from(22)
                    ));

                    assert_eq!(result.unwrap_err().to_string(), format!("Replacement transaction underpriced. A gasPrice/maxFeePerGas of at least 22 is necessary to replace the existing transaction with nonce {}.", $nonce));

                    let transaction4 = dummy_eip1559_transaction(sender, $nonce, U256::from(22), U256::from(21))?;
                    let result = fixture.add_transaction(transaction4);

                    assert!(matches!(
                        result,
                        Err(MemPoolAddTransactionError::ReplacementMaxPriorityFeePerGasTooLow {
                            min_new_max_priority_fee_per_gas,
                            transaction_nonce: $nonce,
                        }) if min_new_max_priority_fee_per_gas == U256::from(22)
                    ));

                    assert_eq!(result.unwrap_err().to_string(), format!("Replacement transaction underpriced. A gasPrice/maxPriorityFeePerGas of at least 22 is necessary to replace the existing transaction with nonce {}.", $nonce));

                    let $name = fixture.mem_pool.$name().collect::<Vec<_>>();
                    assert_eq!($name.len(), 1);
                    assert_eq!(*$name[0].pending(), transaction1);


                    Ok(())
                }
            }
        )+
    };
}

impl_test_replace_transaction_gas_price_too_low! {
    pending_transactions => 0u64,
    future_transactions => 1u64,
}

#[test]
fn multiple_senders_add_transactions() -> anyhow::Result<()> {
    let sender1 = Address::random();
    let sender2 = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[
        (sender1, AccountInfo::default()),
        (sender2, AccountInfo::default()),
    ]);

    let transaction1 = dummy_eip155_transaction(sender1, 0)?;
    fixture.add_transaction(transaction1.clone())?;

    let transaction2 = dummy_eip155_transaction(sender2, 0)?;
    fixture.add_transaction(transaction2.clone())?;

    let pending_transactions = fixture.mem_pool.pending_transactions().collect::<Vec<_>>();
    assert_eq!(pending_transactions.len(), 2);
    assert_eq!(*pending_transactions[0].pending(), transaction1);
    assert_eq!(*pending_transactions[1].pending(), transaction2);

    Ok(())
}

#[test]
fn multiple_senders_separate_future_queues() -> anyhow::Result<()> {
    let sender1 = Address::random();
    let sender2 = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[
        (sender1, AccountInfo::default()),
        (sender2, AccountInfo::default()),
    ]);

    let transaction1 = dummy_eip155_transaction(sender1, 0)?;
    fixture.add_transaction(transaction1.clone())?;

    let transaction2 = dummy_eip155_transaction(sender2, 0)?;
    fixture.add_transaction(transaction2.clone())?;

    let transaction3 = dummy_eip155_transaction(sender1, 2)?;
    fixture.add_transaction(transaction3.clone())?;

    let transaction4 = dummy_eip155_transaction(sender2, 1)?;
    fixture.add_transaction(transaction4.clone())?;

    let pending_transactions = fixture.mem_pool.pending_transactions().collect::<Vec<_>>();
    assert_eq!(pending_transactions.len(), 3);
    assert_eq!(*pending_transactions[0].pending(), transaction1);
    assert_eq!(*pending_transactions[1].pending(), transaction2);
    assert_eq!(*pending_transactions[2].pending(), transaction4);

    let future_transactions = fixture.mem_pool.future_transactions().collect::<Vec<_>>();
    assert_eq!(future_transactions.len(), 1);
    assert_eq!(*future_transactions[0].pending(), transaction3);

    Ok(())
}

#[test]
fn add_transaction_exceeds_block_limit() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let exceeds_block_limit = fixture.mem_pool.block_gas_limit() + 1;
    let transaction = dummy_eip155_transaction_with_limit(sender, 5, exceeds_block_limit)?;
    let result = fixture.add_transaction(transaction);

    assert!(matches!(
        result,
        Err(MemPoolAddTransactionError::ExceedsBlockGasLimit { block_gas_limit, transaction_gas_limit })
            if block_gas_limit == fixture.mem_pool.block_gas_limit() && transaction_gas_limit == exceeds_block_limit
    ));

    Ok(())
}

#[test]
fn add_transaction_nonce_too_low() -> anyhow::Result<()> {
    const SENDER_NONCE: u64 = 1;
    const TRANSACTION_NONCE: u64 = 0;

    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(
        sender,
        AccountInfo {
            nonce: SENDER_NONCE,
            ..AccountInfo::default()
        },
    )]);

    let transaction = dummy_eip155_transaction(sender, TRANSACTION_NONCE)?;
    let result = fixture.add_transaction(transaction.clone());

    assert!(matches!(
        result,
        Err(MemPoolAddTransactionError::NonceTooLow {
            transaction_nonce: TRANSACTION_NONCE,
            sender_nonce: SENDER_NONCE
        })
    ));

    Ok(())
}

#[test]
fn add_transaction_already_exists() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let transaction = dummy_eip155_transaction(sender, 0)?;
    fixture.add_transaction(transaction.clone())?;

    let result = fixture.add_transaction(transaction.clone());
    assert!(matches!(
        result,
        Err(MemPoolAddTransactionError::TransactionAlreadyExists {
            transaction_hash,
        }) if transaction_hash == *transaction.hash()
    ));

    Ok(())
}

#[test]
fn add_transaction_insufficient_funds() -> anyhow::Result<()> {
    const GAS_LIMIT: u64 = 21_000;
    const GAS_PRICE: u64 = 900;
    const VALUE: u64 = 5;

    const INITIAL_COST: u64 = GAS_LIMIT * GAS_PRICE + VALUE;
    const BALANCE: u64 = INITIAL_COST - 1;

    let sender = Address::random();

    let balance = U256::from(BALANCE);
    let mut fixture = MemPoolTestFixture::with_accounts(&[(
        sender,
        AccountInfo {
            balance,
            ..AccountInfo::default()
        },
    )]);

    let transaction = dummy_eip155_transaction_with_price_limit_and_value(
        sender,
        0,
        U256::from(GAS_PRICE),
        GAS_LIMIT,
        U256::from(VALUE),
    )?;

    let result = fixture.add_transaction(transaction);

    assert!(matches!(
        result,
        Err(MemPoolAddTransactionError::InsufficientFunds { max_upfront_cost, sender_balance }) if max_upfront_cost == U256::from(INITIAL_COST) && sender_balance == balance
    ));

    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Sender doesn't have enough funds to send tx"));

    Ok(())
}

#[test]
fn add_transaction_ordering() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let transaction1 = dummy_eip155_transaction(sender, 1)?;
    fixture.add_transaction(transaction1.clone())?;

    let transaction2 = dummy_eip155_transaction(sender, 4)?;
    fixture.add_transaction(transaction2.clone())?;

    let transaction3 = dummy_eip155_transaction(sender, 2)?;
    fixture.add_transaction(transaction3.clone())?;

    let transaction4 = dummy_eip155_transaction(sender, 0)?;
    fixture.add_transaction(transaction4.clone())?;

    let pending_transactions = fixture.mem_pool.pending_transactions().collect::<Vec<_>>();
    assert_eq!(pending_transactions.len(), 3);
    assert_eq!(*pending_transactions[0].pending(), transaction4);
    assert_eq!(pending_transactions[0].order_id(), 3);
    assert_eq!(*pending_transactions[1].pending(), transaction1);
    assert_eq!(pending_transactions[1].order_id(), 0);
    assert_eq!(*pending_transactions[2].pending(), transaction3);
    assert_eq!(pending_transactions[2].order_id(), 2);

    Ok(())
}

#[test]
fn transaction_by_hash_pending() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let transaction = dummy_eip155_transaction(sender, 0)?;
    fixture.add_transaction(transaction.clone())?;

    let transaction_by_hash = fixture.mem_pool.transaction_by_hash(transaction.hash());
    assert_eq!(
        transaction_by_hash.map(OrderedTransaction::pending),
        Some(&transaction)
    );

    Ok(())
}

#[test]
fn transaction_by_hash_future() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let transaction = dummy_eip155_transaction(sender, 1)?;
    fixture.add_transaction(transaction.clone())?;

    let transaction_by_hash = fixture.mem_pool.transaction_by_hash(transaction.hash());
    assert_eq!(
        transaction_by_hash.map(OrderedTransaction::pending),
        Some(&transaction)
    );

    Ok(())
}

#[test]
fn transaction_by_hash_remove_pending_after_update() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let transaction = dummy_eip155_transaction(sender, 0)?;
    fixture.add_transaction(transaction.clone())?;

    let transaction_by_hash = fixture.mem_pool.transaction_by_hash(transaction.hash());
    assert_eq!(
        transaction_by_hash.map(OrderedTransaction::pending),
        Some(&transaction)
    );

    fixture.state.modify_account(
        sender,
        AccountModifierFn::new(Box::new(|_balance, nonce, _code| *nonce += 1)),
    )?;

    fixture.update()?;

    let transaction_by_hash = fixture.mem_pool.transaction_by_hash(transaction.hash());
    assert!(transaction_by_hash.is_none());

    Ok(())
}

#[test]
fn transaction_by_hash_remove_future_after_update() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let transaction = dummy_eip155_transaction(sender, 1)?;
    fixture.add_transaction(transaction.clone())?;

    let transaction_by_hash = fixture.mem_pool.transaction_by_hash(transaction.hash());
    assert_eq!(
        transaction_by_hash.map(OrderedTransaction::pending),
        Some(&transaction)
    );

    fixture.state.modify_account(
        sender,
        AccountModifierFn::new(Box::new(|_balance, nonce, _code| *nonce = 2)),
    )?;

    fixture.update()?;

    let transaction_by_hash = fixture.mem_pool.transaction_by_hash(transaction.hash());
    assert!(transaction_by_hash.is_none());

    Ok(())
}

#[test]
fn last_pending_nonce_with_pending() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let transaction1 = dummy_eip155_transaction(sender, 0)?;
    fixture.add_transaction(transaction1.clone())?;

    let next_pending_nonce = fixture.mem_pool.last_pending_nonce(&sender);
    assert_eq!(next_pending_nonce, Some(0));

    Ok(())
}

#[test]
fn last_pending_nonce_with_future() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let transaction1 = dummy_eip155_transaction(sender, 0)?;
    fixture.add_transaction(transaction1.clone())?;

    let transaction2 = dummy_eip155_transaction(sender, 2)?;
    fixture.add_transaction(transaction2.clone())?;

    let next_pending_nonce = fixture.mem_pool.last_pending_nonce(&sender);
    assert_eq!(next_pending_nonce, Some(0));

    Ok(())
}

#[test]
fn last_pending_nonce_all_future_to_pending_queue() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let transaction1 = dummy_eip155_transaction(sender, 0)?;
    fixture.add_transaction(transaction1.clone())?;

    let transaction2 = dummy_eip155_transaction(sender, 2)?;
    fixture.add_transaction(transaction2.clone())?;

    let transaction3 = dummy_eip155_transaction(sender, 1)?;
    fixture.add_transaction(transaction3.clone())?;

    let next_pending_nonce = fixture.mem_pool.last_pending_nonce(&sender);
    assert_eq!(next_pending_nonce, Some(2));

    Ok(())
}

#[test]
fn last_pending_nonce_some_future_to_pending_queue() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let transaction1 = dummy_eip155_transaction(sender, 0)?;
    fixture.add_transaction(transaction1.clone())?;

    let transaction2 = dummy_eip155_transaction(sender, 2)?;
    fixture.add_transaction(transaction2.clone())?;

    let transaction3 = dummy_eip155_transaction(sender, 5)?;
    fixture.add_transaction(transaction3.clone())?;

    let transaction4 = dummy_eip155_transaction(sender, 1)?;
    fixture.add_transaction(transaction4.clone())?;

    let next_pending_nonce = fixture.mem_pool.last_pending_nonce(&sender);
    assert_eq!(next_pending_nonce, Some(2));

    Ok(())
}

#[test]
fn set_block_gas_limit() -> anyhow::Result<()> {
    const NEW_GAS_LIMIT: u64 = 15_000_000;

    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);
    assert_eq!(fixture.mem_pool.block_gas_limit(), 10_000_000);

    fixture.set_block_gas_limit(NEW_GAS_LIMIT)?;
    assert_eq!(fixture.mem_pool.block_gas_limit(), NEW_GAS_LIMIT);

    let transaction = dummy_eip155_transaction_with_limit(sender, 0, NEW_GAS_LIMIT + 1)?;
    let result = fixture.add_transaction(transaction);

    assert!(matches!(
        result,
        Err(MemPoolAddTransactionError::ExceedsBlockGasLimit { block_gas_limit, transaction_gas_limit })
            if block_gas_limit == NEW_GAS_LIMIT && transaction_gas_limit == NEW_GAS_LIMIT + 1
    ));

    Ok(())
}

#[test]
fn set_block_gas_limit_removes_invalid_transactions() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let transaction1 = dummy_eip155_transaction_with_limit(sender, 0, 9_500_000)?;
    fixture.add_transaction(transaction1.clone())?;

    let transaction2 = dummy_eip155_transaction_with_limit(sender, 2, 9_500_000)?;
    fixture.add_transaction(transaction2.clone())?;

    let pending_transactions = fixture.mem_pool.pending_transactions().collect::<Vec<_>>();
    assert_eq!(pending_transactions.len(), 1);

    let future_transactions = fixture.mem_pool.future_transactions().collect::<Vec<_>>();
    assert_eq!(future_transactions.len(), 1);

    fixture.set_block_gas_limit(5_000_000)?;

    let pending_transactions = fixture.mem_pool.pending_transactions().collect::<Vec<_>>();
    assert_eq!(pending_transactions.len(), 0);

    let future_transactions = fixture.mem_pool.future_transactions().collect::<Vec<_>>();
    assert_eq!(future_transactions.len(), 0);

    Ok(())
}

#[test]
fn set_block_gas_limit_moves_future_to_pending_queue() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender, AccountInfo::default())]);

    let transaction1 = dummy_eip155_transaction_with_limit(sender, 0, 100_000)?;
    fixture.add_transaction(transaction1.clone())?;

    let transaction2 = dummy_eip155_transaction_with_limit(sender, 1, 200_000)?;
    fixture.add_transaction(transaction2.clone())?;

    let transaction3 = dummy_eip155_transaction_with_limit(sender, 2, 100_000)?;
    fixture.add_transaction(transaction3.clone())?;

    let transaction4 = dummy_eip155_transaction_with_limit(sender, 4, 100_000)?;
    fixture.add_transaction(transaction4.clone())?;

    let transaction5 = dummy_eip155_transaction_with_limit(sender, 5, 100_000)?;
    fixture.add_transaction(transaction5.clone())?;

    let pending_transactions = fixture.mem_pool.pending_transactions().collect::<Vec<_>>();
    assert_eq!(pending_transactions.len(), 3);
    assert_eq!(*pending_transactions[0].pending(), transaction1);
    assert_eq!(*pending_transactions[1].pending(), transaction2);
    assert_eq!(*pending_transactions[2].pending(), transaction3);

    let future_transactions = fixture.mem_pool.future_transactions().collect::<Vec<_>>();
    assert_eq!(future_transactions.len(), 2);
    assert_eq!(*future_transactions[0].pending(), transaction4);
    assert_eq!(*future_transactions[1].pending(), transaction5);

    fixture.set_block_gas_limit(150_000)?;

    let pending_transactions = fixture.mem_pool.pending_transactions().collect::<Vec<_>>();
    assert_eq!(pending_transactions.len(), 1);
    assert_eq!(*pending_transactions[0].pending(), transaction1);

    let future_transactions = fixture.mem_pool.future_transactions().collect::<Vec<_>>();
    assert_eq!(future_transactions.len(), 3);
    assert_eq!(*future_transactions[0].pending(), transaction4);
    assert_eq!(*future_transactions[1].pending(), transaction5);
    assert_eq!(*future_transactions[2].pending(), transaction3);

    Ok(())
}

#[test]
fn update_removes_transactions_with_invalid_nonce() -> anyhow::Result<()> {
    let sender1 = Address::random();
    let sender2 = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(sender1, AccountInfo::default())]);

    let transaction1 = dummy_eip155_transaction(sender1, 0)?;
    fixture.add_transaction(transaction1.clone())?;

    let transaction2 = dummy_eip155_transaction(sender1, 1)?;
    fixture.add_transaction(transaction2.clone())?;

    let transaction3 = dummy_eip155_transaction(sender2, 0)?;
    fixture.add_transaction(transaction3.clone())?;

    let transaction4 = dummy_eip155_transaction(sender2, 1)?;
    fixture.add_transaction(transaction4.clone())?;

    fixture.state.modify_account(
        sender1,
        AccountModifierFn::new(Box::new(|_balance, nonce, _code| *nonce = 1)),
    )?;

    fixture.state.modify_account(
        sender2,
        AccountModifierFn::new(Box::new(|_balance, nonce, _code| *nonce = 1)),
    )?;

    fixture.update()?;

    let pending_transactions = fixture.mem_pool.pending_transactions().collect::<Vec<_>>();
    assert_eq!(pending_transactions.len(), 2);
    assert_eq!(*pending_transactions[0].pending(), transaction2);
    assert_eq!(*pending_transactions[1].pending(), transaction4);

    Ok(())
}

#[test]
fn update_removes_transactions_with_insufficient_balance() -> anyhow::Result<()> {
    let sender = Address::random();

    let mut fixture = MemPoolTestFixture::with_accounts(&[(
        sender,
        AccountInfo {
            balance: U256::from(100_000_000u64),
            ..AccountInfo::default()
        },
    )]);

    let transaction1 = dummy_eip155_transaction_with_price(sender, 0, U256::from(900))?;
    fixture.add_transaction(transaction1.clone())?;

    let transaction2 = dummy_eip155_transaction_with_price(sender, 2, U256::from(900))?;
    fixture.add_transaction(transaction2.clone())?;

    let pending_transactions = fixture.mem_pool.pending_transactions().collect::<Vec<_>>();
    assert_eq!(pending_transactions.len(), 1);

    let future_transactions = fixture.mem_pool.future_transactions().collect::<Vec<_>>();
    assert_eq!(future_transactions.len(), 1);

    fixture.state.modify_account(
        sender,
        AccountModifierFn::new(Box::new(|balance, _nonce, _code| *balance = U256::ZERO)),
    )?;

    fixture.update()?;

    let pending_transactions = fixture.mem_pool.pending_transactions().collect::<Vec<_>>();
    assert_eq!(pending_transactions.len(), 0);

    let future_transactions = fixture.mem_pool.future_transactions().collect::<Vec<_>>();
    assert_eq!(future_transactions.len(), 0);

    Ok(())
}
