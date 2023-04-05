use std::fmt::Debug;

use revm::db::BlockHashRef;

/// Trait that meets all requirements for a synchronous database that can be used by [`AsyncBlockchain`].
pub trait SyncBlockchain<E>: BlockHashRef<Error = E> + Send + Sync + Debug + 'static
where
    E: Debug + Send,
{
}

impl<B, E> SyncBlockchain<E> for B
where
    B: BlockHashRef<Error = E> + Send + Sync + Debug + 'static,
    E: Debug + Send,
{
}
