use std::fmt::Debug;

use napi::bindgen_prelude::{BigInt, Buffer};
use napi_derive::napi;
use rethnet_eth::Bytes;
use rethnet_evm::{AccountInfo, KECCAK_EMPTY};

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
        let (code_hash, code) = self.code.map_or((KECCAK_EMPTY, None), |code| {
            let code_hash = rethnet_eth::B256::from_slice(&code.hash);

            let code = Bytes::copy_from_slice(&code.code);
            let code = rethnet_evm::Bytecode::new_raw(code);

            debug_assert_eq!(code_hash, code.hash_slow());

            (code_hash, Some(code))
        });

        Ok(AccountInfo {
            balance: self.balance.try_cast()?,
            nonce: self.nonce.get_u64().1,
            code_hash,
            code,
        })
    }
}
