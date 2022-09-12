pub use bytes::Bytes;
pub use db::layered_db::{LayeredDatabase, RethnetLayer};
pub use debug::DatabaseDebug;
pub use hashbrown::HashMap;
pub use primitive_types::{H160, H256, U256};
pub use revm::{
    db::DatabaseRef, db::EmptyDB, Account, AccountInfo, Bytecode, CreateScheme, Database,
    DatabaseCommit, ExecutionResult, Log, Return, TransactOut, TransactTo, TxEnv, EVM,
};

pub type State = HashMap<H160, Account>;

mod db;
mod debug;

pub struct Rethnet<D: Database + DatabaseCommit> {
    evm: EVM<D>,
}

impl<D: Database + DatabaseCommit> Rethnet<D> {
    pub fn with_database(db: D) -> Self {
        let mut evm = EVM::new();
        evm.database(db);

        Self { evm }
    }

    // ?
    // TransactTo::Call & TransactTo::Create
    // For both cases, can we do a dry run and state-changing run?
    pub fn call(&mut self, tx: TxEnv) -> (ExecutionResult, State) {
        self.evm.env.tx = tx;
        self.evm.transact()
    }

    pub fn run(&mut self, tx: TxEnv) -> ExecutionResult {
        self.evm.env.tx = tx;
        self.evm.transact_commit()
    }
}
