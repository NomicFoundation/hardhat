use anyhow::anyhow;
use bytes::Bytes;
use hashbrown::HashMap;
use primitive_types::{H160, H256, U256};
use revm::{Account, AccountInfo, Bytecode, Database, DatabaseCommit, KECCAK_EMPTY};

use crate::DatabaseDebug;

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

    pub fn last_layer_mut(&mut self) -> &mut Layer {
        // The `LayeredDatabase` always has at least one layer
        self.stack.last_mut().unwrap()
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

#[derive(Debug, Default)]
pub struct RethnetLayer {
    /// Address -> AccountInfo
    account_infos: HashMap<H160, AccountInfo>,
    /// Address -> Storage
    storage: HashMap<H160, HashMap<U256, U256>>,
    /// Code hash -> Address
    contracts: HashMap<H256, Bytes>,
    /// Block number -> Block hash
    block_hashes: HashMap<U256, H256>,
}

impl RethnetLayer {
    /// Creates a `RethnetLayer` with the provided genesis accounts.
    pub fn with_genesis_accounts(genesis_accounts: HashMap<H160, AccountInfo>) -> Self {
        Self {
            account_infos: genesis_accounts,
            ..Default::default()
        }
    }

    /// Insert the `AccountInfo` with at the specified `address`.
    pub fn insert_account(&mut self, address: H160, mut account_info: AccountInfo) {
        if let Some(code) = account_info.code.take() {
            if !code.is_empty() {
                account_info.code_hash = code.hash();
                self.contracts.insert(code.hash(), code.bytes().clone());
            }
        }

        if account_info.code_hash.is_zero() {
            account_info.code_hash = KECCAK_EMPTY;
        }

        self.account_infos.insert(address, account_info);
    }
}

impl Database for LayeredDatabase<RethnetLayer> {
    type Error = anyhow::Error;

    fn basic(&mut self, address: H160) -> anyhow::Result<Option<AccountInfo>> {
        Ok(self
            .iter()
            .find_map(|layer| layer.account_infos.get(&address).cloned()))
    }

    fn code_by_hash(&mut self, code_hash: H256) -> anyhow::Result<Bytecode> {
        self.iter()
            .find_map(|layer| {
                layer.contracts.get(&code_hash).map(|bytecode| unsafe {
                    Bytecode::new_raw_with_hash(bytecode.clone(), code_hash)
                })
            })
            .ok_or_else(|| {
                anyhow!(
                    "Layered database does not contain contract with code hash: {}.",
                    code_hash,
                )
            })
    }

    fn storage(&mut self, address: H160, index: U256) -> anyhow::Result<U256> {
        self.iter()
            .find_map(|layer| {
                layer
                    .storage
                    .get(&address)
                    .and_then(|storage| storage.get(&index))
                    .cloned()
            })
            .ok_or_else(|| {
                anyhow!(
                    "Layered database does not contain storage with address: {}; and index: {}.",
                    address,
                    index
                )
            })
    }

    fn block_hash(&mut self, number: U256) -> anyhow::Result<H256> {
        self.iter()
            .find_map(|layer| layer.block_hashes.get(&number).cloned())
            .ok_or_else(|| {
                anyhow!(
                    "Layered database does not contain block hash with number: {}.",
                    number
                )
            })
    }
}

impl DatabaseCommit for LayeredDatabase<RethnetLayer> {
    fn commit(&mut self, changes: HashMap<H160, Account>) {
        let last_layer = self.last_layer_mut();

        changes.into_iter().for_each(|(address, account)| {
            if account.is_empty() || account.is_destroyed {
                last_layer.account_infos.remove(&address);
            } else {
                last_layer.insert_account(address, account.info);

                let storage = last_layer
                    .storage
                    .entry(address)
                    .and_modify(|storage| {
                        if account.storage_cleared {
                            storage.clear();
                        }
                    })
                    .or_default();

                account.storage.into_iter().for_each(|(index, value)| {
                    let value = value.present_value();
                    if value.is_zero() {
                        storage.remove(&index);
                    } else {
                        storage.insert(index, value);
                    }
                });

                if storage.is_empty() {
                    last_layer.storage.remove(&address);
                }
            }
        });
    }
}

impl DatabaseDebug for LayeredDatabase<RethnetLayer> {
    type Error = anyhow::Error;

    fn insert_account(
        &mut self,
        address: H160,
        account_info: AccountInfo,
    ) -> Result<(), Self::Error> {
        self.last_layer_mut()
            .account_infos
            .insert(address, account_info);

        Ok(())
    }

    fn insert_block(&mut self, block_number: U256, block_hash: H256) -> Result<(), Self::Error> {
        self.last_layer_mut()
            .block_hashes
            .insert(block_number, block_hash);

        Ok(())
    }

    fn set_account_balance(&mut self, address: H160, balance: U256) -> Result<(), Self::Error> {
        if let Some(account_info) = self.last_layer_mut().account_infos.get_mut(&address) {
            account_info.balance = balance;
        } else {
            let mut account_info = self
                .iter()
                .find_map(|layer| layer.account_infos.get(&address).cloned())
                .ok_or_else(|| anyhow!("Unknown account with address: {}", address))?;

            account_info.balance = balance;
            self.last_layer_mut().insert_account(address, account_info);
        }

        Ok(())
    }

    fn set_account_code(&mut self, address: H160, code: Bytecode) -> Result<(), Self::Error> {
        let code_hash = code.hash();

        let old_code_hash =
            if let Some(account_info) = self.last_layer_mut().account_infos.get_mut(&address) {
                let old_code_hash = if account_info.code_hash != KECCAK_EMPTY {
                    Some(code_hash)
                } else {
                    None
                };

                account_info.code_hash = code_hash;

                old_code_hash
            } else {
                let mut account_info = self
                    .iter()
                    .find_map(|layer| layer.account_infos.get(&address).cloned())
                    .ok_or_else(|| anyhow!("Unknown account with address: {}", address))?;

                account_info.code_hash = code_hash;
                self.last_layer_mut().insert_account(address, account_info);

                None
            };

        if let Some(code_hash) = old_code_hash {
            self.last_layer_mut().contracts.remove(&code_hash);
        }

        self.last_layer_mut()
            .contracts
            .insert(code_hash, code.bytes().clone());

        Ok(())
    }

    fn set_account_nonce(&mut self, address: H160, nonce: u64) -> Result<(), Self::Error> {
        if let Some(account_info) = self.last_layer_mut().account_infos.get_mut(&address) {
            account_info.nonce = nonce;
        } else {
            let mut account_info = self
                .iter()
                .find_map(|layer| layer.account_infos.get(&address).cloned())
                .ok_or_else(|| anyhow!("Unknown account with address: {}", address))?;

            account_info.nonce = nonce;
            self.last_layer_mut().insert_account(address, account_info);
        }

        Ok(())
    }

    fn set_account_storage_slot(
        &mut self,
        address: H160,
        index: U256,
        value: U256,
    ) -> Result<(), Self::Error> {
        match self.last_layer_mut().storage.entry(address) {
            hashbrown::hash_map::Entry::Occupied(mut entry) => {
                entry.get_mut().insert(index, value);
            }
            hashbrown::hash_map::Entry::Vacant(entry) => {
                let mut account_storage = HashMap::new();
                account_storage.insert(index, value);
                entry.insert(account_storage);
            }
        }

        Ok(())
    }

    fn storage_root(&mut self) -> Result<H256, Self::Error> {
        todo!()
    }

    fn checkpoint(&mut self) -> Result<(), Self::Error> {
        self.add_layer_default();
        Ok(())
    }

    fn revert(&mut self) -> Result<(), Self::Error> {
        let last_layer_id = self.last_layer_id();
        if last_layer_id > 0 {
            self.revert_to_layer(last_layer_id - 1);
            Ok(())
        } else {
            Err(anyhow!("No checkpoints to revert."))
        }
    }
}
