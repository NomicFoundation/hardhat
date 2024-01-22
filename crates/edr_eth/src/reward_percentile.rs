/// Wrapper for a validated reward percentile.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
#[repr(transparent)]
#[cfg_attr(feature = "serde", serde(transparent))]
pub struct RewardPercentile(f64);

impl TryFrom<f64> for RewardPercentile {
    type Error = InvalidRewardPercentile;

    fn try_from(value: f64) -> Result<Self, Self::Error> {
        if (0.0..=100.0).contains(&value) {
            Ok(Self(value))
        } else {
            Err(InvalidRewardPercentile)
        }
    }
}

impl From<RewardPercentile> for f64 {
    fn from(value: RewardPercentile) -> Self {
        value.0
    }
}

impl AsRef<f64> for RewardPercentile {
    fn as_ref(&self) -> &f64 {
        &self.0
    }
}

/// Error type for `RewardPercentile::try_from`.
#[derive(Clone, Copy, Debug, thiserror::Error)]
#[error("Reward percentile must be in range [0, 100]")]
pub struct InvalidRewardPercentile;
