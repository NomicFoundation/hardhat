use std::time::{Duration, Instant};

use rethnet_eth::{
    remote::{
        filter::{FilterBlockTarget, FilterOptions, FilteredEvents, OneOrMoreAddresses},
        jsonrpc::ResponseData,
        BlockSpec,
    },
    Address, B256, U256,
};

use super::{StateType, _block_number_from_block_spec, _block_number_from_hash};

pub struct _FilterCriteria {
    pub _from_block: U256,
    pub _to_block: U256,
    pub _addresses: Vec<Address>,
    pub _topics: Vec<B256>,
}

impl _FilterCriteria {
    async fn _from_request_and_state<T>(
        request_options: FilterOptions,
        state: StateType,
    ) -> Result<Self, ResponseData<T>> {
        let (_from_block, _to_block) = match request_options.block_target {
            Some(FilterBlockTarget::Hash(hash)) => {
                let block_number = _block_number_from_hash(&state, &hash, false).await?;
                (block_number, block_number)
            }
            Some(FilterBlockTarget::Range { from, to }) => {
                let from =
                    _block_number_from_block_spec(&state, &from.unwrap_or(BlockSpec::latest()))
                        .await?;
                let to = match to {
                    None => from,
                    Some(to) => _block_number_from_block_spec(&state, &to).await?,
                };
                (from, to)
            }
            None => {
                let latest_block_number = state.blockchain.read().await.last_block_number();
                (latest_block_number, latest_block_number)
            }
        };

        let _addresses = match request_options.addresses {
            Some(OneOrMoreAddresses::One(address)) => vec![address],
            Some(OneOrMoreAddresses::Many(addresses)) => addresses,
            None => Vec::new(),
        };

        let _topics = request_options.topics.unwrap_or(Vec::new());

        Ok(Self {
            _from_block,
            _to_block,
            _addresses,
            _topics,
        })
    }
}

pub struct Filter {
    // TODO: later, when adding in the rest of the filter methods, consider removing this `type`
    // field entirely.  i suspect it's probably redundant as compared to the type implied by the
    // variants in `events`, but that suspicion will be confirmed or denied by the addition of
    // those other filter methods.
    // r#type: SubscriptionType,
    pub _criteria: Option<_FilterCriteria>,
    pub deadline: std::time::Instant,
    pub events: FilteredEvents,
    pub is_subscription: bool,
}

pub fn new_filter_deadline() -> Instant {
    Instant::now() + Duration::from_secs(5 * 60)
}
