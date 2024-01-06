mod criteria;

use std::{
    mem,
    time::{Duration, Instant},
};

use edr_eth::{
    remote::filter::{FilteredEvents, LogOutput, SubscriptionType},
    B256,
};

pub use self::criteria::FilterCriteria;

pub struct Filter {
    pub data: FilterData,
    pub deadline: Instant,
    pub is_subscription: bool,
}

impl Filter {
    /// Constructs a new block filter.
    pub fn new_block_filter(block_hash: B256, is_subscription: bool) -> Self {
        Self::new_filter(FilterData::NewHeads(vec![block_hash]), is_subscription)
    }

    /// Constructs a new log filter.
    pub fn new_log_filter(
        criteria: FilterCriteria,
        logs: Vec<LogOutput>,
        is_subscription: bool,
    ) -> Self {
        Self::new_filter(FilterData::Logs { criteria, logs }, is_subscription)
    }

    /// Constructs a new pending transaction filter.
    pub fn new_pending_transaction_filter(is_subscription: bool) -> Self {
        Self::new_filter(
            FilterData::NewPendingTransactions(Vec::new()),
            is_subscription,
        )
    }

    fn new_filter(data: FilterData, is_subscription: bool) -> Self {
        Self {
            deadline: new_filter_deadline(),
            data,
            is_subscription,
        }
    }

    /// Take events from the filter
    pub fn take_events(&mut self) -> FilteredEvents {
        self.deadline = new_filter_deadline();
        self.data.take_events()
    }

    /// Take log events from the filter if the filter is a log events filter.
    pub fn take_log_events(&mut self) -> Option<Vec<LogOutput>> {
        match &mut self.data {
            FilterData::Logs { logs, .. } => {
                self.deadline = new_filter_deadline();
                Some(std::mem::take(logs))
            }
            _ => None,
        }
    }
}

/// represents the output of `eth_getFilterChanges`
#[derive(Clone, Debug, PartialEq)]
pub enum FilterData {
    /// logs
    Logs {
        criteria: FilterCriteria,
        logs: Vec<LogOutput>,
    },
    /// new block heads
    NewHeads(Vec<B256>),
    /// new pending transactions
    NewPendingTransactions(Vec<B256>),
}

impl FilterData {
    /// Move the memory out of the variant.
    pub fn take_events(&mut self) -> FilteredEvents {
        match self {
            Self::Logs { logs, .. } => FilteredEvents::Logs(mem::take(logs)),
            Self::NewHeads(v) => FilteredEvents::NewHeads(mem::take(v)),
            Self::NewPendingTransactions(v) => FilteredEvents::NewPendingTransactions(mem::take(v)),
        }
    }

    /// Returns the type of the variant.
    pub fn subscription_type(&self) -> SubscriptionType {
        match self {
            Self::Logs { .. } => SubscriptionType::Logs,
            Self::NewHeads(_) => SubscriptionType::NewHeads,
            Self::NewPendingTransactions(_) => SubscriptionType::NewPendingTransactions,
        }
    }
}

fn new_filter_deadline() -> Instant {
    Instant::now() + Duration::from_secs(5 * 60)
}
