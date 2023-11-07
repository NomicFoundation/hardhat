use std::time::{Duration, Instant};

use edr_eth::remote::filter::{FilteredEvents, LogOutput};

pub struct Filter {
    pub deadline: Instant,
    pub events: FilteredEvents,
    pub is_subscription: bool,
}

impl Filter {
    pub fn new(events: FilteredEvents, is_subscription: bool) -> Self {
        Self {
            deadline: new_filter_deadline(),
            events,
            is_subscription,
        }
    }

    /// Take events from the filter
    pub fn take_events(&mut self) -> FilteredEvents {
        self.deadline = new_filter_deadline();
        self.events.take()
    }

    /// Take log events from the filter if the filter is a log events filter.
    pub fn take_log_events(&mut self) -> Option<Vec<LogOutput>> {
        match &mut self.events {
            FilteredEvents::Logs(events) => {
                self.deadline = new_filter_deadline();
                Some(std::mem::take(events))
            }
            _ => None,
        }
    }
}

fn new_filter_deadline() -> Instant {
    Instant::now() + Duration::from_secs(5 * 60)
}
