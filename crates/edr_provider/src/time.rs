use std::time::{SystemTime, SystemTimeError};

use auto_impl::auto_impl;
#[cfg(any(test, feature = "test-utils"))]
pub use test_utils::*;

/// A trait for getting the elapsed time in seconds.
#[auto_impl(&, Arc)]
pub trait TimeSinceEpoch: Send + Sync + 'static {
    /// Returns the number of seconds elapsed since the provided time.
    fn since(&self, other: SystemTime) -> Result<u64, SystemTimeError>;

    /// Returns the current time in seconds since the Unix epoch.
    fn since_epoch(&self) -> u64;
}

/// A `TimeSinceEpoch` implementation that uses the current time.
#[derive(Clone, Copy, Debug)]
pub struct CurrentTime;

impl TimeSinceEpoch for CurrentTime {
    fn since(&self, other: SystemTime) -> Result<u64, SystemTimeError> {
        SystemTime::now()
            .duration_since(other)
            .map(|duration| duration.as_secs())
    }

    fn since_epoch(&self) -> u64 {
        SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .expect("Time went backwards")
            .as_secs()
    }
}

#[cfg(any(test, feature = "test-utils"))]
mod test_utils {
    use std::{
        sync::atomic::{AtomicU64, Ordering},
        time::{Duration, SystemTime, SystemTimeError},
    };

    use super::{CurrentTime, TimeSinceEpoch};

    /// An internally mutable mock implementation of `TimeSinceEpoch`.
    #[derive(Debug)]
    pub struct MockTime(AtomicU64);

    impl MockTime {
        /// Constructs a new instance with the current time since the Unix
        /// epoch.
        pub fn now() -> Self {
            Self(AtomicU64::new(CurrentTime.since_epoch()))
        }

        /// Constructs a new instance with the provided time since the Unix
        /// epoch.
        pub fn with_seconds(time: u64) -> Self {
            Self(AtomicU64::new(time))
        }

        /// Adds the provided number of seconds to the current time.
        pub fn add_seconds(&self, seconds: u64) {
            self.0.fetch_add(seconds, Ordering::Relaxed);
        }
    }

    impl TimeSinceEpoch for MockTime {
        fn since(&self, other: SystemTime) -> Result<u64, SystemTimeError> {
            let elapsed_since_epoch = self.0.load(Ordering::Relaxed);
            let now = SystemTime::UNIX_EPOCH + Duration::from_secs(elapsed_since_epoch);

            now.duration_since(other).map(|duration| duration.as_secs())
        }

        fn since_epoch(&self) -> u64 {
            self.0.load(Ordering::Relaxed)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mock_time_with_seconds() {
        const ADDED_SECONDS: u64 = 10;

        let start_time = MockTime::now().since_epoch();

        let mock_time = MockTime::with_seconds(start_time + ADDED_SECONDS);
        assert_eq!(mock_time.since_epoch(), start_time + ADDED_SECONDS);
    }

    #[test]
    fn mock_time_add_seconds() {
        const ADDED_SECONDS: u64 = 10;

        let mock_time = MockTime::now();

        let start_time = mock_time.since_epoch();
        assert_eq!(mock_time.since_epoch(), start_time);

        mock_time.add_seconds(ADDED_SECONDS);
        assert_eq!(mock_time.since_epoch(), start_time + ADDED_SECONDS);

        let mock_time = MockTime::with_seconds(start_time + ADDED_SECONDS);
        assert_eq!(mock_time.since_epoch(), start_time + ADDED_SECONDS);
    }
}
