use auto_impl::auto_impl;
use rethnet_eth::B256;

/// A trait for debug operation on a database.
#[auto_impl(Box)]
pub trait StateHistory {
    /// The database's error type.
    type Error;

    /// Reverts the state to match the specified state root.
    fn set_state_root(&mut self, state_root: &B256) -> Result<(), Self::Error>;

    /// Creates a checkpoint that can be reverted to using [`revert`].
    fn checkpoint(&mut self) -> Result<(), Self::Error>;

    /// Reverts to the previous checkpoint, created using [`checkpoint`].
    fn revert(&mut self) -> Result<(), Self::Error>;

    /// Makes a snapshot of the database that's retained until [`remove_snapshot`] is called. Returns the snapshot's identifier and whether
    /// that snapshot already existed.
    fn make_snapshot(&mut self) -> (B256, bool);

    /// Removes the snapshot corresponding to the specified state root, if it exists. Returns whether a snapshot was removed.
    fn remove_snapshot(&mut self, state_root: &B256) -> bool;
}
