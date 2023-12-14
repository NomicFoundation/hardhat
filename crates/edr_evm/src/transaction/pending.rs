use std::ops::Deref;

use edr_eth::{
    transaction::{
        EIP155SignedTransaction, Eip1559SignedTransaction, Eip2930SignedTransaction,
        Eip4844SignedTransaction, LegacySignedTransaction, SignedTransaction, TransactionKind,
    },
    Address, U256,
};
use revm::{
    interpreter::gas::initial_tx_gas,
    primitives::{
        BerlinSpec, ByzantiumSpec, CreateScheme, FrontierSpec, HomesteadSpec, IstanbulSpec,
        LatestSpec, LondonSpec, MergeSpec, PetersburgSpec, ShanghaiSpec, SpecId,
        SpuriousDragonSpec, TangerineSpec, TransactTo, TxEnv,
    },
};

use super::TransactionCreationError;

/// A transaction that's pending inclusion in a block.
#[derive(Clone, Debug)]
pub struct PendingTransaction {
    transaction: SignedTransaction,
    caller: Address,
}

impl PendingTransaction {
    /// Create a [`PendingTransaction`] by attempting to validate and recover
    /// the caller address of the provided transaction.
    pub fn new(
        spec_id: SpecId,
        transaction: SignedTransaction,
    ) -> Result<Self, TransactionCreationError> {
        let caller = transaction
            .recover()
            .map_err(TransactionCreationError::Signature)?;

        Self::with_caller(spec_id, transaction, caller)
    }

    /// Creates a [`PendingTransaction`] with the provided transaction and
    /// caller address.
    pub fn with_caller(
        spec_id: SpecId,
        transaction: SignedTransaction,
        caller: Address,
    ) -> Result<Self, TransactionCreationError> {
        if transaction.kind() == TransactionKind::Create && transaction.data().is_empty() {
            return Err(TransactionCreationError::ContractMissingData);
        }

        let initial_cost = Self::initial_cost(spec_id, &transaction);
        if transaction.gas_limit() < initial_cost {
            return Err(TransactionCreationError::InsufficientGas {
                initial_gas_cost: U256::from(initial_cost),
                gas_limit: U256::from(transaction.gas_limit()),
            });
        }

        Ok(Self {
            transaction,
            caller,
        })
    }

    /// Returns the [`PendingTransaction`]'s caller.
    pub fn caller(&self) -> &Address {
        &self.caller
    }

    /// Returns the inner [`SignedTransaction`]
    pub fn transaction(&self) -> &SignedTransaction {
        &self.transaction
    }

    /// Returns the inner transaction and caller
    pub fn into_inner(self) -> (SignedTransaction, Address) {
        (self.transaction, self.caller)
    }

    fn initial_cost(spec_id: SpecId, transaction: &SignedTransaction) -> u64 {
        let access_list: Option<Vec<(Address, Vec<U256>)>> =
            transaction.access_list().cloned().map(Into::into);

        match spec_id {
            SpecId::FRONTIER | SpecId::FRONTIER_THAWING => initial_tx_gas::<FrontierSpec>(
                transaction.data(),
                transaction.kind() == TransactionKind::Create,
                access_list.as_ref().map_or(&[], |access_list| access_list),
            ),
            SpecId::HOMESTEAD | SpecId::DAO_FORK => initial_tx_gas::<HomesteadSpec>(
                transaction.data(),
                transaction.kind() == TransactionKind::Create,
                access_list.as_ref().map_or(&[], |access_list| access_list),
            ),
            SpecId::TANGERINE => initial_tx_gas::<TangerineSpec>(
                transaction.data(),
                transaction.kind() == TransactionKind::Create,
                access_list.as_ref().map_or(&[], |access_list| access_list),
            ),
            SpecId::SPURIOUS_DRAGON => initial_tx_gas::<SpuriousDragonSpec>(
                transaction.data(),
                transaction.kind() == TransactionKind::Create,
                access_list.as_ref().map_or(&[], |access_list| access_list),
            ),
            SpecId::BYZANTIUM => initial_tx_gas::<ByzantiumSpec>(
                transaction.data(),
                transaction.kind() == TransactionKind::Create,
                access_list.as_ref().map_or(&[], |access_list| access_list),
            ),
            SpecId::PETERSBURG | SpecId::CONSTANTINOPLE => initial_tx_gas::<PetersburgSpec>(
                transaction.data(),
                transaction.kind() == TransactionKind::Create,
                access_list.as_ref().map_or(&[], |access_list| access_list),
            ),
            SpecId::ISTANBUL | SpecId::MUIR_GLACIER => initial_tx_gas::<IstanbulSpec>(
                transaction.data(),
                transaction.kind() == TransactionKind::Create,
                access_list.as_ref().map_or(&[], |access_list| access_list),
            ),
            SpecId::BERLIN => initial_tx_gas::<BerlinSpec>(
                transaction.data(),
                transaction.kind() == TransactionKind::Create,
                access_list.as_ref().map_or(&[], |access_list| access_list),
            ),
            SpecId::LONDON | SpecId::ARROW_GLACIER | SpecId::GRAY_GLACIER => {
                initial_tx_gas::<LondonSpec>(
                    transaction.data(),
                    transaction.kind() == TransactionKind::Create,
                    access_list.as_ref().map_or(&[], |access_list| access_list),
                )
            }
            SpecId::MERGE => initial_tx_gas::<MergeSpec>(
                transaction.data(),
                transaction.kind() == TransactionKind::Create,
                access_list.as_ref().map_or(&[], |access_list| access_list),
            ),
            SpecId::SHANGHAI => initial_tx_gas::<ShanghaiSpec>(
                transaction.data(),
                transaction.kind() == TransactionKind::Create,
                access_list.as_ref().map_or(&[], |access_list| access_list),
            ),
            SpecId::CANCUN => initial_tx_gas::<LatestSpec>(
                transaction.data(),
                transaction.kind() == TransactionKind::Create,
                access_list.as_ref().map_or(&[], |access_list| access_list),
            ),
            SpecId::LATEST => initial_tx_gas::<LatestSpec>(
                transaction.data(),
                transaction.kind() == TransactionKind::Create,
                access_list.as_ref().map_or(&[], |access_list| access_list),
            ),
        }
    }
}

impl Deref for PendingTransaction {
    type Target = SignedTransaction;

    fn deref(&self) -> &Self::Target {
        &self.transaction
    }
}

impl From<PendingTransaction> for TxEnv {
    fn from(transaction: PendingTransaction) -> Self {
        fn transact_to(kind: TransactionKind) -> TransactTo {
            match kind {
                TransactionKind::Call(address) => TransactTo::Call(address),
                TransactionKind::Create => TransactTo::Create(CreateScheme::Create),
            }
        }

        let chain_id = transaction.transaction.chain_id();
        match transaction.transaction {
            SignedTransaction::PreEip155Legacy(LegacySignedTransaction {
                nonce,
                gas_price,
                gas_limit,
                kind,
                value,
                input,
                ..
            })
            | SignedTransaction::PostEip155Legacy(EIP155SignedTransaction {
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
                blob_hashes: Vec::new(),
                max_fee_per_blob_gas: None,
            },
            SignedTransaction::Eip2930(Eip2930SignedTransaction {
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
                access_list: access_list.into(),
                blob_hashes: Vec::new(),
                max_fee_per_blob_gas: None,
            },
            SignedTransaction::Eip1559(Eip1559SignedTransaction {
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
                access_list: access_list.into(),
                blob_hashes: Vec::new(),
                max_fee_per_blob_gas: None,
            },
            SignedTransaction::Eip4844(Eip4844SignedTransaction {
                nonce,
                max_priority_fee_per_gas,
                max_fee_per_gas,
                max_fee_per_blob_gas,
                gas_limit,
                to,
                value,
                input,
                access_list,
                blob_hashes,
                ..
            }) => Self {
                caller: transaction.caller,
                gas_limit,
                gas_price: max_fee_per_gas,
                transact_to: TransactTo::Call(to),
                value,
                data: input,
                nonce: Some(nonce),
                chain_id,
                access_list: access_list.into(),
                gas_priority_fee: Some(max_priority_fee_per_gas),
                blob_hashes,
                max_fee_per_blob_gas: Some(max_fee_per_blob_gas),
            },
        }
    }
}
