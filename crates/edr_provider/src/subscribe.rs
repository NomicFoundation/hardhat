use dyn_clone::DynClone;
use edr_eth::{remote::filter::LogOutput, B256, U256};
use edr_evm::{blockchain::BlockchainError, BlockAndTotalDifficulty};

/// Subscription event.
#[derive(Clone, Debug)]
pub struct SubscriptionEvent {
    pub filter_id: U256,
    pub result: SubscriptionEventData,
}

/// Subscription event data.
#[derive(Clone, Debug)]
pub enum SubscriptionEventData {
    Log(LogOutput),
    NewHeads(BlockAndTotalDifficulty<BlockchainError>),
    NewPendingTransactions(B256),
}

/// Supertrait for subscription callbacks.
pub trait SyncSubscriberCallback: Fn(SubscriptionEvent) + DynClone + Send + Sync {}

impl<F> SyncSubscriberCallback for F where F: Fn(SubscriptionEvent) + DynClone + Send + Sync {}

dyn_clone::clone_trait_object!(SyncSubscriberCallback);
