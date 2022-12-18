use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Status,
};
use rethnet_eth::{Bytes, B256, U256};
use rethnet_evm::{AccountInfo, Bytecode};

use crate::{Account, AccountData};

/// An attempted conversion that consumes `self`, which may or may not be
/// expensive. It is identical to [`TryInto`], but it allows us to implement
/// the trait for external types.
pub trait TryCast<T>: Sized {
    /// The type returned in the event of a conversion error.
    type Error;

    /// Performs the conversion.
    fn try_cast(self) -> Result<T, Self::Error>;
}

impl TryCast<AccountInfo> for Account {
    type Error = napi::Error;

    fn try_cast(self) -> std::result::Result<AccountInfo, Self::Error> {
        Ok(AccountInfo {
            balance: self.balance.try_cast()?,
            nonce: self.nonce.get_u64().1,
            code_hash: B256::from_slice(&self.code_hash),
            code: self
                .code
                .map(|code| Bytecode::new_raw(Bytes::copy_from_slice(&code))),
        })
    }
}

impl TryCast<(U256, u64, Option<Bytecode>)> for AccountData {
    type Error = napi::Error;

    fn try_cast(self) -> Result<(U256, u64, Option<Bytecode>), Self::Error> {
        let balance = self.balance.try_cast()?;
        let nonce = self.nonce.get_u64().1;
        let code = self
            .code
            .map(|code| Bytecode::new_raw(Bytes::copy_from_slice(&code)));

        Ok((balance, nonce, code))
    }
}

impl TryCast<B256> for Buffer {
    type Error = napi::Error;

    fn try_cast(self) -> std::result::Result<B256, Self::Error> {
        Ok(B256::from_slice(&self))
    }
}

impl TryCast<Bytecode> for Buffer {
    type Error = napi::Error;

    fn try_cast(self) -> Result<Bytecode, Self::Error> {
        let bytes = Bytes::copy_from_slice(&self);

        Ok(Bytecode::new_raw(bytes))
    }
}

impl TryCast<U256> for BigInt {
    type Error = napi::Error;

    fn try_cast(mut self) -> std::result::Result<U256, Self::Error> {
        let num_words = self.words.len();
        match num_words.cmp(&4) {
            std::cmp::Ordering::Less => self.words.append(&mut vec![0u64; 4 - num_words]),
            std::cmp::Ordering::Equal => (),
            std::cmp::Ordering::Greater => {
                return Err(napi::Error::new(
                    Status::InvalidArg,
                    "BigInt cannot have more than 4 words.".to_owned(),
                ));
            }
        }

        Ok(U256::from_limbs(self.words.try_into().unwrap()))
    }
}
