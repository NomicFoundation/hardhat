use edr_eth::{
    remote::filter::{FilterCriteriaOptions, FilteredEvents, LogOutput},
    U256,
};

use crate::{data::ProviderData, filter::FilterCriteria, ProviderError};

pub fn handle_get_filter_changes_request(
    data: &mut ProviderData,
    filter_id: U256,
) -> Result<Option<FilteredEvents>, ProviderError> {
    Ok(data.get_filter_changes(&filter_id))
}

pub fn handle_get_filter_logs_request(
    data: &mut ProviderData,
    filter_id: U256,
) -> Result<Option<Vec<LogOutput>>, ProviderError> {
    data.get_filter_logs(&filter_id)
}

pub fn handle_new_block_filter_request(data: &mut ProviderData) -> Result<U256, ProviderError> {
    data.add_block_filter::<false>()
}

pub fn handle_new_log_filter_request(
    data: &mut ProviderData,
    filter_criteria: FilterCriteriaOptions,
) -> Result<U256, ProviderError> {
    let filter_criteria = validate_filter_criteria(filter_criteria)?;

    data.add_log_filter::<false>(filter_criteria)
}

pub fn handle_new_pending_transaction_filter_request(
    data: &mut ProviderData,
) -> Result<U256, ProviderError> {
    Ok(data.add_pending_transaction_filter::<false>())
}

pub fn handle_uninstall_filter_request(
    data: &mut ProviderData,
    filter_id: U256,
) -> Result<bool, ProviderError> {
    Ok(data.remove_filter(&filter_id))
}

pub fn handle_unsubscribe_request(
    data: &mut ProviderData,
    filter_id: U256,
) -> Result<bool, ProviderError> {
    Ok(data.remove_subscription(&filter_id))
}

fn validate_filter_criteria(
    filter_criteria: FilterCriteriaOptions,
) -> Result<FilterCriteria, ProviderError> {
    todo!()
}
