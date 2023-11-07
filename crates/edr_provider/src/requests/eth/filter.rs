use edr_eth::{
    remote::filter::{FilteredEvents, LogOutput},
    U256,
};

use crate::{data::ProviderData, ProviderError};

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

pub fn handle_new_pending_transaction_filter_request(
    data: &mut ProviderData,
) -> Result<U256, ProviderError> {
    Ok(data.new_pending_transaction_filter())
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
