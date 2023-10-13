use napi::bindgen_prelude::BigInt;
use napi_derive::napi;

use crate::cast::TryCast;

#[napi(object)]
pub struct Signature {
    /// R value
    pub r: BigInt,
    /// S value
    pub s: BigInt,
    /// V value
    pub v: BigInt,
}

impl From<&edr_eth::signature::Signature> for Signature {
    fn from(value: &edr_eth::signature::Signature) -> Self {
        Self {
            r: BigInt {
                sign_bit: false,
                words: value.r.as_limbs().to_vec(),
            },
            s: BigInt {
                sign_bit: false,
                words: value.s.as_limbs().to_vec(),
            },
            v: BigInt::from(value.v),
        }
    }
}

impl TryFrom<Signature> for edr_eth::signature::Signature {
    type Error = napi::Error;

    fn try_from(value: Signature) -> Result<Self, Self::Error> {
        Ok(Self {
            r: value.r.try_cast()?,
            s: value.s.try_cast()?,
            v: value.v.try_cast()?,
        })
    }
}
