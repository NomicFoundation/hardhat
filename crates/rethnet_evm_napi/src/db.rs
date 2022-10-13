mod debug;
mod immutable;
mod mutable;

pub use debug::*;
pub use immutable::*;
pub use mutable::*;
use rethnet_evm::sync::Client;

pub(super) fn client(
    db: JsDatabase,
    db_commit: Option<JsDatabaseCommitInner>,
    db_debug: Option<JsDatabaseDebugInner>,
) -> anyhow::Result<Client> {
    if let Some(db_commit) = db_commit {
        if let Some(db_debug) = db_debug {
            Client::with_db_mut_debug(JsDatabaseCommitDebug::new(db, db_commit, db_debug))
        } else {
            Client::with_db_mut(JsDatabaseCommit::new(db, db_commit))
        }
    } else if let Some(db_debug) = db_debug {
        Client::with_db_debug(JsDatabaseDebug::new(db, db_debug))
    } else {
        Client::with_db(db)
    }
}
