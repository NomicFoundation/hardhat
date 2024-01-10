use edr_eth::{remote::filter::LogOutput, B256, U256};
use edr_evm::LocalBlock;

/// Subscription event.
#[derive(Clone, Debug)]
pub struct SubscriptionEvent {
    pub filter_id: U256,
    pub result: SubscriptionEventData,
}

/// Subscription event data.
#[derive(Clone, Debug)]
pub enum SubscriptionEventData {
    Logs(Vec<LogOutput>),
    NewHeads(LocalBlock),
    NewPendingTransactions(B256),
}
