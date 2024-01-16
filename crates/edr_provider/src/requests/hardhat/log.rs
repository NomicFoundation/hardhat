use crate::{data::ProviderData, ProviderError};

pub fn handle_set_logging_enabled_request(
    data: &mut ProviderData,
    is_enabled: bool,
) -> Result<bool, ProviderError> {
    data.logger_mut().set_is_enabled(is_enabled);
    Ok(true)
}
