use core::fmt::Debug;

use crate::{data::ProviderData, ProviderError};

pub fn handle_set_logging_enabled_request<LoggerErrorT: Debug>(
    data: &mut ProviderData<LoggerErrorT>,
    is_enabled: bool,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    data.logger_mut().set_is_enabled(is_enabled);
    Ok(true)
}
