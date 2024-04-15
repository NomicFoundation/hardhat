use core::fmt::Debug;

use crate::{data::ProviderData, time::TimeSinceEpoch, ProviderError};

pub fn handle_set_logging_enabled_request<LoggerErrorT: Debug, TimerT: Clone + TimeSinceEpoch>(
    data: &mut ProviderData<LoggerErrorT, TimerT>,
    is_enabled: bool,
) -> Result<bool, ProviderError<LoggerErrorT>> {
    data.logger_mut().set_is_enabled(is_enabled);
    Ok(true)
}
