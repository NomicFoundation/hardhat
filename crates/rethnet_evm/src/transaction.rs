use rethnet_eth::{
    receipt::Log,
    signature::SignatureError,
    transaction::{
        EIP1559SignedTransaction, EIP2930SignedTransaction, LegacySignedTransaction,
        SignedTransaction, TransactionKind,
    },
    Address, Bloom, Bytes, B256, U256,
};

/// Represents all relevant information of an executed transaction
#[derive(Debug, Eq, PartialEq, Clone)]
pub struct TransactionInfo {
    pub transaction_hash: B256,
    pub transaction_index: u32,
    pub from: Address,
    pub to: Option<Address>,
    pub contract_address: Option<Address>,
    pub logs: Vec<Log>,
    pub logs_bloom: Bloom,
    // pub traces: todo!(),
    pub exit: revm::Return,
    pub out: Option<Bytes>,
}

/// A transaction that's pending inclusion in a block.
pub struct PendingTransaction {
    /// A signed transaction
    pub transaction: SignedTransaction,
    caller: Address,
}

impl PendingTransaction {
    /// Create a [`PendingTransaction`] by attempting to validate and recover the caller address of the provided transaction.
    pub fn new(transaction: SignedTransaction) -> Result<Self, SignatureError> {
        let caller = transaction.recover()?;
        Ok(Self::with_caller(transaction, caller))
    }

    /// Creates a [`PendingTransaction`] with the provided transaction and caller address.
    pub fn with_caller(transaction: SignedTransaction, caller: Address) -> Self {
        Self {
            transaction,
            caller,
        }
    }
}

impl From<PendingTransaction> for revm::TxEnv {
    fn from(transaction: PendingTransaction) -> Self {
        fn transact_to(kind: TransactionKind) -> revm::TransactTo {
            match kind {
                TransactionKind::Call(address) => revm::TransactTo::Call(address),
                TransactionKind::Create => revm::TransactTo::Create(revm::CreateScheme::Create),
            }
        }

        fn into_access_list(
            access_list: rethnet_eth::access_list::AccessList,
        ) -> Vec<(Address, Vec<U256>)> {
            access_list
                .0
                .into_iter()
                .map(|item| (item.address, item.storage_keys))
                .collect()
        }

        let chain_id = transaction.transaction.chain_id();
        match transaction.transaction {
            SignedTransaction::Legacy(LegacySignedTransaction {
                nonce,
                gas_price,
                gas_limit,
                kind,
                value,
                input,
                ..
            }) => Self {
                caller: transaction.caller,
                gas_limit,
                gas_price,
                gas_priority_fee: None,
                transact_to: transact_to(kind),
                value,
                data: input,
                chain_id,
                nonce: Some(nonce),
                access_list: Vec::new(),
            },
            SignedTransaction::EIP2930(EIP2930SignedTransaction {
                nonce,
                gas_price,
                gas_limit,
                kind,
                value,
                input,
                access_list,
                ..
            }) => Self {
                caller: transaction.caller,
                gas_limit,
                gas_price,
                gas_priority_fee: None,
                transact_to: transact_to(kind),
                value,
                data: input,
                chain_id,
                nonce: Some(nonce),
                access_list: into_access_list(access_list),
            },
            SignedTransaction::EIP1559(EIP1559SignedTransaction {
                nonce,
                max_priority_fee_per_gas,
                max_fee_per_gas,
                gas_limit,
                kind,
                value,
                input,
                access_list,
                ..
            }) => Self {
                caller: transaction.caller,
                gas_limit,
                gas_price: max_fee_per_gas,
                gas_priority_fee: Some(max_priority_fee_per_gas),
                transact_to: transact_to(kind),
                value,
                data: input,
                chain_id,
                nonce: Some(nonce),
                access_list: into_access_list(access_list),
            },
        }
    }
}

// /// Queued transaction
// #[derive(Clone, Debug, PartialEq, Eq)]
// pub struct PendingTransaction {
//     /// The actual transaction
//     pub transaction: TypedTransaction,
//     /// the recovered sender of this transaction
//     sender: Address,
//     /// hash of `transaction`, so it can easily be reused with encoding and hashing agan
//     hash: B256,
// }

// impl PendingTransaction {
//     /// Creates a new pending transaction and tries to verify transaction and recover sender.
//     pub fn new(transaction: TypedTransaction) -> Result<Self, SignatureError> {
//         let sender = transaction.recover()?;
//         Ok(Self::with_sender(transaction, sender))
//     }

//     /// Creates a new transaction with the given sender
//     pub fn with_sender(transaction: TypedTransaction, sender: Address) -> Self {
//         Self {
//             hash: transaction.hash(),
//             transaction,
//             sender,
//         }
//     }

//     pub fn nonce(&self) -> &u64 {
//         self.transaction.nonce()
//     }

//     pub fn hash(&self) -> &B256 {
//         &self.hash
//     }

//     pub fn sender(&self) -> &Address {
//         &self.sender
//     }
// }
