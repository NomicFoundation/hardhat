use bytes::Bytes;
use hashbrown::HashMap;
use primitive_types::{H160, H256, U256};
use revm::{
    Account, AccountInfo, Bytecode, Database, DatabaseCommit, Log, Return, TransactOut, TxEnv, EVM,
};

pub type State = HashMap<H160, Account>;

pub struct LayeredDatabase<Layer> {
    stack: Vec<Layer>,
}

impl<Layer> LayeredDatabase<Layer> {
    pub fn with_layer(layer: Layer) -> Self {
        Self { stack: vec![layer] }
    }

    pub fn last_layer_id(&self) -> usize {
        self.stack.len() - 1
    }

    pub fn add_layer(&mut self, layer: Layer) -> (usize, &mut Layer) {
        let layer_id = self.stack.len();
        self.stack.push(layer);
        (layer_id, self.stack.last_mut().unwrap())
    }

    pub fn revert_to_layer(&mut self, layer_id: usize) {
        assert!(layer_id < self.stack.len(), "Invalid layer id.");
        self.stack.truncate(layer_id + 1);
    }

    pub fn iter(&self) -> impl Iterator<Item = &Layer> {
        self.stack.iter().rev()
    }
}

impl<Layer: Default> LayeredDatabase<Layer> {
    pub fn add_layer_default(&mut self) -> (usize, &mut Layer) {
        self.add_layer(Layer::default())
    }
}

impl<Layer: Default> Default for LayeredDatabase<Layer> {
    fn default() -> Self {
        Self {
            stack: vec![Layer::default()],
        }
    }
}

pub struct RethnetLayer {
    /// Address -> AccountInfo
    accounts: HashMap<H160, AccountInfo>,
    /// Address -> Storage
    storage: HashMap<H160, HashMap<U256, U256>>,
    /// Code hash -> Address
    contracts: HashMap<H256, Bytes>,
    /// Block number -> Block hash
    blocks: HashMap<U256, H256>,
}

pub struct RemoteDatabase {
    url: String,
    pinned_block_number: Option<U256>,
}

pub struct LazyForkedDatabase {
    url: String,
    pinned_block_number: Option<U256>,
    /// newest to oldest
    cached_layers: Vec<RethnetLayer>,
}

impl Database for LazyForkedDatabase {
    fn basic(&mut self, address: H160) -> AccountInfo {
        if let Some(cached_account) = self
            .cached_layers
            .iter()
            .find_map(|layer| layer.accounts.get(&address))
        {
            return cached_account.clone();
        }

        todo!()
    }

    fn code_by_hash(&mut self, code_hash: H256) -> Bytecode {
        todo!()
    }

    fn storage(&mut self, address: H160, index: U256) -> U256 {
        todo!()
    }

    fn block_hash(&mut self, number: U256) -> H256 {
        todo!()
    }
}

pub struct HardhatDatabase;

impl Database for LayeredDatabase<RethnetLayer> {
    fn basic(&mut self, address: H160) -> AccountInfo {
        // TODO: If it doesn't exist, look up in the fork
        self.accounts
            .get(&address)
            .map_or(AccountInfo::default(), Clone::clone)
    }

    fn code_by_hash(&mut self, code_hash: H256) -> revm::Bytecode {
        // TODO: If it doesn't exist, look up in the fork
        self.accounts
            .iter()
            .find_map(|(_, account_info)| {
                if account_info.code_hash == code_hash {
                    account_info.code.clone()
                } else {
                    None
                }
            })
            .unwrap_or_default()
    }

    fn storage(&mut self, address: H160, index: U256) -> U256 {
        todo!()
    }

    fn block_hash(&mut self, number: U256) -> H256 {
        todo!()
    }
}

impl DatabaseCommit for LazyForkedDatabase {
    fn commit(&mut self, changes: HashMap<primitive_types::H160, revm::Account>) {
        todo!()
    }
}
