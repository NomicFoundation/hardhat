use napi::{
    bindgen_prelude::{BigInt, Buffer},
    Status,
};
use rethnet_eth::{B256, U256};

/// An attempted conversion that consumes `self`, which may or may not be
/// expensive. It is identical to [`TryInto`], but it allows us to implement
/// the trait for external types.
pub trait TryCast<T>: Sized {
    /// The type returned in the event of a conversion error.
    type Error;

    /// Performs the conversion.
    fn try_cast(self) -> Result<T, Self::Error>;
}

impl TryCast<B256> for Buffer {
    type Error = napi::Error;

    fn try_cast(self) -> std::result::Result<B256, Self::Error> {
        if self.len() != 32 {
            return Err(napi::Error::new(
                Status::InvalidArg,
                "Buffer was expected to be 32 bytes.".to_string(),
            ));
        }
        Ok(B256::from_slice(&self))
    }
}

impl TryCast<u64> for BigInt {
    type Error = napi::Error;

    fn try_cast(self) -> std::result::Result<u64, Self::Error> {
        let (signed, value, lossless) = self.get_u64();

        if signed {
            return Err(napi::Error::new(
                Status::InvalidArg,
                "BigInt was expected to be unsigned.".to_string(),
            ));
        }

        if !lossless {
            return Err(napi::Error::new(
                Status::InvalidArg,
                "BigInt was expected to fit within 64 bits.".to_string(),
            ));
        }

        Ok(value)
    }
}

impl TryCast<usize> for BigInt {
    type Error = napi::Error;

    fn try_cast(self) -> std::result::Result<usize, Self::Error> {
        let size: u64 = BigInt::try_cast(self)?;
        usize::try_from(size).map_err(|e| napi::Error::new(Status::InvalidArg, e.to_string()))
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
