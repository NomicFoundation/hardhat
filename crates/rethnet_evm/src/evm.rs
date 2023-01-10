use std::fmt::Debug;

use revm::{BlockEnv, CfgEnv, TxEnv};

use crate::{blockchain::AsyncBlockchain, db::AsyncDatabase};

/// Creates an evm from the provided database, config, transaction, and block.
#[allow(clippy::type_complexity)]
pub fn build_evm<'b, 'd, E>(
    blockchain: &'b AsyncBlockchain<E>,
    db: &'d AsyncDatabase<E>,
    cfg: CfgEnv,
    transaction: TxEnv,
    block: BlockEnv,
) -> revm::EVM<&'d AsyncDatabase<E>, &'b AsyncBlockchain<E>>
where
    E: Debug + Send + 'static,
{
    let mut evm = revm::EVM::new();
    evm.set_blockchain(blockchain);
    evm.database(db);
    evm.env.cfg = cfg;
    evm.env.block = block;
    evm.env.tx = transaction;

    evm
}
