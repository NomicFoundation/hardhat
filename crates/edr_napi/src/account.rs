use std::fmt::Debug;

use edr_eth::{
    signature::{secret_key_from_str, secret_key_to_address},
    Address, Bytes, U256,
};
use edr_evm::{AccountInfo, HashMap, KECCAK_EMPTY};
use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Status,
};
use napi_derive::napi;

use crate::cast::TryCast;

#[napi(object)]
pub struct Bytecode {
    /// 256-bit code hash
    #[napi(readonly)]
    pub hash: Buffer,
    /// Byte code
    #[napi(readonly)]
    pub code: Buffer,
}

#[napi(object)]
#[derive(Debug)]
pub struct Account {
    /// Account balance
    #[napi(readonly)]
    pub balance: BigInt,
    /// Account nonce
    #[napi(readonly)]
    pub nonce: BigInt,
    /// Optionally, byte code. Otherwise, hash is equal to `KECCAK_EMPTY`
    #[napi(readonly)]
    pub code: Option<Bytecode>,
}

impl Debug for Bytecode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Bytecode")
            .field("code_hash", &self.hash.as_ref())
            .field("code", &self.code.as_ref())
            .finish()
    }
}

#[allow(clippy::fallible_impl_from)]
impl From<AccountInfo> for Account {
    #[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
    fn from(account_info: AccountInfo) -> Self {
        let code = if account_info.code_hash == KECCAK_EMPTY {
            None
        } else {
            // We expect the code to always be provided
            // TODO: Make this explicit in the type?
            let code = account_info.code.unwrap();

            Some(Bytecode {
                hash: Buffer::from(account_info.code_hash.as_bytes()),
                code: Buffer::from(code.original_bytes().as_ref()),
            })
        };

        Self {
            balance: BigInt {
                sign_bit: false,
                words: account_info.balance.as_limbs().to_vec(),
            },
            nonce: BigInt::from(account_info.nonce),
            code,
        }
    }
}

impl TryCast<AccountInfo> for Account {
    type Error = napi::Error;

    fn try_cast(self) -> std::result::Result<AccountInfo, Self::Error> {
        let (code_hash, code) = self.code.map_or((Ok(KECCAK_EMPTY), None), |code| {
            let code_hash = TryCast::<edr_eth::B256>::try_cast(code.hash.clone());

            let code = Bytes::copy_from_slice(&code.code);
            let code = edr_evm::Bytecode::new_raw(code);

            debug_assert_eq!(code_hash.clone().unwrap(), code.hash_slow());

            (code_hash, Some(code))
        });

        Ok(AccountInfo {
            balance: self.balance.try_cast()?,
            nonce: self.nonce.get_u64().1,
            code_hash: code_hash?,
            code,
        })
    }
}

/// An account that needs to be created during the genesis block.
#[napi(object)]
pub struct GenesisAccount {
    /// Account secret key
    pub secret_key: String,
    /// Account balance
    pub balance: BigInt,
}

impl TryFrom<GenesisAccount> for edr_provider::AccountConfig {
    type Error = napi::Error;

    fn try_from(value: GenesisAccount) -> Result<Self, Self::Error> {
        let secret_key = secret_key_from_str(&value.secret_key)
            .map_err(|e| napi::Error::new(Status::InvalidArg, e.to_string()))?;

        Ok(Self {
            secret_key,
            balance: value.balance.try_cast()?,
        })
    }
}

#[cfg_attr(feature = "tracing", tracing::instrument(skip_all))]
pub fn genesis_accounts(
    accounts: Vec<GenesisAccount>,
) -> napi::Result<HashMap<Address, AccountInfo>> {
    accounts
        .into_iter()
        .map(|account| {
            let address = secret_key_to_address(&account.secret_key)
                .map_err(|e| napi::Error::new(Status::InvalidArg, e.to_string()))?;
            TryCast::<U256>::try_cast(account.balance).map(|balance| {
                let account_info = AccountInfo {
                    balance,
                    ..Default::default()
                };

                (address, account_info)
            })
        })
        .collect::<napi::Result<HashMap<Address, AccountInfo>>>()
}

/// Mimics activation of precompiles
pub fn add_precompiles(accounts: &mut HashMap<Address, AccountInfo>) {
    for idx in 1..=8 {
        let mut address = Address::ZERO;
        address.0[19] = idx;
        accounts.insert(address, AccountInfo::default());
    }
}
