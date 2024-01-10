use std::sync::Arc;

use alloy_rlp::RlpEncodable;
use edr_eth::{
    block::{self, Header, PartialHeader},
    log::{FilterLog, FullBlockLog, Log, ReceiptLog},
    receipt::{BlockReceipt, TransactionReceipt, TypedReceipt},
    remote::eth,
    transaction::{DetailedTransaction, SignedTransaction},
    trie,
    withdrawal::Withdrawal,
    Address, B256,
};
use itertools::izip;
use revm::primitives::keccak256;

use crate::{blockchain::BlockchainError, Block, SyncBlock};

/// A locally mined block, which contains complete information.
#[derive(Clone, Debug, PartialEq, Eq, RlpEncodable)]
#[rlp(trailing)]
pub struct LocalBlock {
    header: block::Header,
    transactions: Vec<SignedTransaction>,
    #[rlp(skip)]
    transaction_callers: Vec<Address>,
    #[rlp(skip)]
    transaction_receipts: Vec<Arc<BlockReceipt>>,
    ommers: Vec<block::Header>,
    #[rlp(skip)]
    ommer_hashes: Vec<B256>,
    withdrawals: Option<Vec<Withdrawal>>,
    #[rlp(skip)]
    hash: B256,
}

impl LocalBlock {
    /// Constructs an empty block, i.e. no transactions.
    pub fn empty(partial_header: PartialHeader) -> Self {
        Self::new(
            partial_header,
            Vec::new(),
            Vec::new(),
            Vec::new(),
            Vec::new(),
            None,
        )
    }

    /// Constructs a new instance with the provided data.
    pub fn new(
        mut partial_header: PartialHeader,
        transactions: Vec<SignedTransaction>,
        transaction_callers: Vec<Address>,
        transaction_receipts: Vec<TransactionReceipt<Log>>,
        ommers: Vec<Header>,
        withdrawals: Option<Vec<Withdrawal>>,
    ) -> Self {
        let ommer_hashes = ommers.iter().map(Header::hash).collect::<Vec<_>>();
        let ommers_hash = keccak256(alloy_rlp::encode(&ommers));
        let transactions_root = trie::ordered_trie_root(transactions.iter().map(alloy_rlp::encode));

        if let Some(withdrawals) = withdrawals.as_ref() {
            partial_header.withdrawals_root = Some(trie::ordered_trie_root(
                withdrawals.iter().map(alloy_rlp::encode),
            ));
        }

        let header = Header::new(partial_header, ommers_hash, transactions_root);

        let hash = header.hash();
        let transaction_receipts =
            transaction_to_block_receipts(&hash, header.number, transaction_receipts);

        Self {
            header,
            transactions,
            transaction_callers,
            transaction_receipts,
            ommers,
            ommer_hashes,
            withdrawals,
            hash,
        }
    }

    /// Returns the receipts of the block's transactions.
    pub fn transaction_receipts(&self) -> &[Arc<BlockReceipt>] {
        &self.transaction_receipts
    }

    /// Retrieves the block's transactions.
    pub fn detailed_transactions(&self) -> impl Iterator<Item = DetailedTransaction<'_>> {
        izip!(
            self.transactions.iter(),
            self.transaction_callers.iter(),
            self.transaction_receipts.iter()
        )
        .map(|(transaction, caller, receipt)| {
            DetailedTransaction::new(transaction, caller, receipt)
        })
    }
}

impl Block for LocalBlock {
    type Error = BlockchainError;

    fn hash(&self) -> &B256 {
        &self.hash
    }

    fn header(&self) -> &block::Header {
        &self.header
    }

    fn rlp_size(&self) -> u64 {
        alloy_rlp::encode(self)
            .len()
            .try_into()
            .expect("usize fits into u64")
    }

    fn transactions(&self) -> &[SignedTransaction] {
        &self.transactions
    }

    fn transaction_callers(&self) -> &[Address] {
        &self.transaction_callers
    }

    fn transaction_receipts(&self) -> Result<Vec<Arc<BlockReceipt>>, Self::Error> {
        Ok(self.transaction_receipts.clone())
    }

    fn ommer_hashes(&self) -> &[B256] {
        self.ommer_hashes.as_slice()
    }

    fn withdrawals(&self) -> Option<&[Withdrawal]> {
        self.withdrawals.as_deref()
    }
}

fn transaction_to_block_receipts(
    block_hash: &B256,
    block_number: u64,
    receipts: Vec<TransactionReceipt<Log>>,
) -> Vec<Arc<BlockReceipt>> {
    let mut log_index = 0;

    receipts
        .into_iter()
        .enumerate()
        .map(|(transaction_index, receipt)| {
            let transaction_index = transaction_index as u64;

            Arc::new(BlockReceipt {
                inner: TransactionReceipt {
                    inner: TypedReceipt {
                        cumulative_gas_used: receipt.inner.cumulative_gas_used,
                        logs_bloom: receipt.inner.logs_bloom,
                        logs: receipt
                            .inner
                            .logs
                            .into_iter()
                            .map(|log| FilterLog {
                                inner: FullBlockLog {
                                    inner: ReceiptLog {
                                        inner: log,
                                        transaction_hash: receipt.transaction_hash,
                                    },
                                    block_hash: *block_hash,
                                    block_number,
                                    log_index: {
                                        let index = log_index;
                                        log_index += 1;
                                        index
                                    },
                                    transaction_index,
                                },
                                // Assuming a local block is never reorged out.
                                removed: false,
                            })
                            .collect(),
                        data: receipt.inner.data,
                    },
                    transaction_hash: receipt.transaction_hash,
                    transaction_index,
                    from: receipt.from,
                    to: receipt.to,
                    contract_address: receipt.contract_address,
                    gas_used: receipt.gas_used,
                    effective_gas_price: receipt.effective_gas_price,
                },
                block_hash: *block_hash,
                block_number,
            })
        })
        .collect()
}

impl From<LocalBlock> for Arc<dyn SyncBlock<Error = BlockchainError>> {
    fn from(value: LocalBlock) -> Self {
        Arc::new(value)
    }
}
