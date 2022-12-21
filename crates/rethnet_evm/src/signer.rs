use anyhow::anyhow;
use hashbrown::HashMap;
use rethnet_eth::{
    transaction::{SignedTransaction, TransactionRequest},
    Address,
};
use secp256k1::{Secp256k1, SecretKey, VerifyOnly};

pub struct Signer {
    accounts: HashMap<Address, SecretKey>,
    context: Secp256k1<VerifyOnly>,
}

impl Signer {
    pub fn new() -> Self {
        Self {
            accounts: HashMap::new(),
            context: Secp256k1::verification_only(),
        }
    }

    pub fn sign(
        &self,
        request: TransactionRequest,
        caller: &Address,
    ) -> anyhow::Result<SignedTransaction> {
        let signer = self
            .accounts
            .get(caller)
            .ok_or_else(|| anyhow!("Signer for address `{}` does not exist.", caller))?;
    }
}
