use core::fmt;
use std::str::FromStr;

use secp256k1::{
    ecdsa::{RecoverableSignature, RecoveryId},
    PublicKey, Secp256k1, ThirtyTwoByteHash,
};
use sha3::{Digest, Keccak256};
use thiserror::Error;

use crate::{utils::hash_message, Address, H256, U256};

/// Converts a [`PublicKey`] to an [`Address`].
pub fn public_key_to_address(public_key: PublicKey) -> Address {
    let hash = Keccak256::digest(&public_key.serialize_uncompressed()[1..]);
    // Only take the lower 160 bits of the hash
    Address::from_slice(&hash[12..])
}

/// An error involving a signature.
#[derive(Debug, Error)]
pub enum SignatureError {
    /// Invalid length, secp256k1 signatures are 65 bytes
    #[error("invalid signature length, got {0}, expected 65")]
    InvalidLength(usize),
    /// When parsing a signature from string to hex
    #[error(transparent)]
    DecodingError(#[from] hex::FromHexError),
    /// Thrown when signature verification failed (i.e. when the address that
    /// produced the signature did not match the expected address)
    #[error("Signature verification failed. Expected {0}, got {1}")]
    VerificationError(Address, Address),
    /// Internal error during signature recovery
    #[error(transparent)]
    K256Error(#[from] secp256k1::Error),
    /// Error in recovering public key from signature
    #[error("Public key recovery error")]
    RecoveryError,
}

/// Recovery message data.
///
/// The message data can either be a binary message that is first hashed
/// according to EIP-191 and then recovered based on the signature or a
/// precomputed hash.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum RecoveryMessage {
    /// Message bytes
    Data(Vec<u8>),
    /// Message hash
    Hash(H256),
}

#[derive(Debug, Clone, PartialEq, Eq, Copy, Hash)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
/// An ECDSA signature
pub struct Signature {
    /// R value
    pub r: U256,
    /// S Value
    pub s: U256,
    /// V value
    pub v: u64,
}

impl fmt::Display for Signature {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let sig = <[u8; 65]>::from(self);
        write!(f, "{}", hex::encode(&sig[..]))
    }
}

impl Signature {
    /// Verifies that signature on `message` was produced by `address`
    pub fn verify<M, A>(&self, message: M, address: A) -> Result<(), SignatureError>
    where
        M: Into<RecoveryMessage>,
        A: Into<Address>,
    {
        let address = address.into();
        let recovered = self.recover(message)?;
        if recovered != address {
            return Err(SignatureError::VerificationError(address, recovered));
        }

        Ok(())
    }

    /// Recovers the Ethereum address which was used to sign the given message.
    ///
    /// Recovery signature data uses 'Electrum' notation, this means the `v`
    /// value is expected to be either `27` or `28`.
    pub fn recover<M>(&self, message: M) -> Result<Address, SignatureError>
    where
        M: Into<RecoveryMessage>,
    {
        let message = message.into();
        let message_hash = match message {
            RecoveryMessage::Data(ref message) => hash_message(message),
            RecoveryMessage::Hash(hash) => hash,
        };

        struct Hash(H256);

        impl ThirtyTwoByteHash for Hash {
            fn into_32(self) -> [u8; 32] {
                self.0 .0
            }
        }

        let message_hash = Hash(message_hash);

        let (recoverable_sig, _recovery_id) = self.as_signature()?;

        let context = Secp256k1::verification_only();
        let public_key = context.recover_ecdsa(&message_hash.into(), &recoverable_sig)?;

        Ok(public_key_to_address(public_key))
    }

    /// Retrieves the recovery signature.
    fn as_signature(&self) -> Result<(RecoverableSignature, RecoveryId), SignatureError> {
        let recovery_id = self.recovery_id()?;
        let signature = {
            let r_bytes = self.r.to_be_bytes::<32>();
            let s_bytes = self.s.to_be_bytes::<32>();

            let mut bytes = [0u8; 64];
            bytes[..32].copy_from_slice(&r_bytes);
            bytes[32..64].copy_from_slice(&s_bytes);

            RecoverableSignature::from_compact(&bytes, recovery_id)?
        };

        Ok((signature, recovery_id))
    }

    /// Retrieve the recovery ID.
    pub fn recovery_id(&self) -> Result<RecoveryId, SignatureError> {
        let standard_v = normalize_recovery_id(self.v);
        Ok(RecoveryId::from_i32(standard_v)?)
    }

    /// Copies and serializes `self` into a new `Vec` with the recovery id included
    #[allow(clippy::wrong_self_convention)]
    pub fn to_vec(&self) -> Vec<u8> {
        self.into()
    }

    /// Decodes a signature from RLP bytes, assuming no RLP header
    #[cfg(feature = "fastrlp")]
    pub(crate) fn decode_signature(buf: &mut &[u8]) -> Result<Self, open_fastrlp::DecodeError> {
        let v = u64::decode(buf)?;
        Ok(Self {
            r: U256::decode(buf)?,
            s: U256::decode(buf)?,
            v,
        })
    }
}

#[cfg(feature = "fastrlp")]
impl open_fastrlp::Decodable for Signature {
    fn decode(buf: &mut &[u8]) -> Result<Self, open_fastrlp::DecodeError> {
        Self::decode_signature(buf)
    }
}

#[cfg(feature = "fastrlp")]
impl open_fastrlp::Encodable for Signature {
    fn length(&self) -> usize {
        self.r.length() + self.s.length() + self.v.length()
    }
    fn encode(&self, out: &mut dyn bytes::BufMut) {
        self.v.encode(out);
        self.r.encode(out);
        self.s.encode(out);
    }
}

fn normalize_recovery_id(v: u64) -> i32 {
    match v {
        0 => 0,
        1 => 1,
        27 => 0,
        28 => 1,
        v if v >= 35 => ((v - 1) % 2) as _,
        _ => 4,
    }
}

impl<'a> TryFrom<&'a [u8]> for Signature {
    type Error = SignatureError;

    /// Parses a raw signature which is expected to be 65 bytes long where
    /// the first 32 bytes is the `r` value, the second 32 bytes the `s` value
    /// and the final byte is the `v` value in 'Electrum' notation.
    fn try_from(bytes: &'a [u8]) -> Result<Self, Self::Error> {
        if bytes.len() != 65 {
            return Err(SignatureError::InvalidLength(bytes.len()));
        }

        let (r_bytes, remainder) = bytes.split_at(32);
        let r = U256::from_be_bytes::<32>(r_bytes.try_into().unwrap());

        let (s_bytes, remainder) = remainder.split_at(32);
        let s = U256::from_be_bytes::<32>(s_bytes.try_into().unwrap());

        let v = remainder[0];

        Ok(Signature { r, s, v: v.into() })
    }
}

impl FromStr for Signature {
    type Err = SignatureError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let s = s.strip_prefix("0x").unwrap_or(s);
        let bytes = hex::decode(s)?;
        Signature::try_from(&bytes[..])
    }
}

impl From<&Signature> for [u8; 65] {
    fn from(src: &Signature) -> [u8; 65] {
        let mut sig = [0u8; 65];
        let r_bytes = src.r.to_be_bytes::<32>();
        let s_bytes = src.s.to_be_bytes::<32>();
        sig[..32].copy_from_slice(&r_bytes);
        sig[32..64].copy_from_slice(&s_bytes);
        // TODO: What if we try to serialize a signature where
        // the `v` is not normalized?

        // The u64 to u8 cast is safe because `sig.v` can only ever be 27 or 28
        // here. Regarding EIP-155, the modification to `v` happens during tx
        // creation only _after_ the transaction is signed using
        // `ethers_signers::to_eip155_v`.
        sig[64] = src.v as u8;
        sig
    }
}

impl From<Signature> for [u8; 65] {
    fn from(src: Signature) -> [u8; 65] {
        <[u8; 65]>::from(&src)
    }
}

impl From<&Signature> for Vec<u8> {
    fn from(src: &Signature) -> Vec<u8> {
        <[u8; 65]>::from(src).to_vec()
    }
}

impl From<Signature> for Vec<u8> {
    fn from(src: Signature) -> Vec<u8> {
        <[u8; 65]>::from(&src).to_vec()
    }
}

impl From<&[u8]> for RecoveryMessage {
    fn from(s: &[u8]) -> Self {
        s.to_owned().into()
    }
}

impl From<Vec<u8>> for RecoveryMessage {
    fn from(s: Vec<u8>) -> Self {
        RecoveryMessage::Data(s)
    }
}

impl From<&str> for RecoveryMessage {
    fn from(s: &str) -> Self {
        s.as_bytes().to_owned().into()
    }
}

impl From<String> for RecoveryMessage {
    fn from(s: String) -> Self {
        RecoveryMessage::Data(s.into_bytes())
    }
}

impl From<[u8; 32]> for RecoveryMessage {
    fn from(hash: [u8; 32]) -> Self {
        H256(hash).into()
    }
}

impl From<H256> for RecoveryMessage {
    fn from(hash: H256) -> Self {
        RecoveryMessage::Hash(hash)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recover_web3_signature() {
        // test vector taken from:
        // https://web3js.readthedocs.io/en/v1.2.2/web3-eth-accounts.html#sign
        let signature = Signature::from_str(
            "b91467e570a6466aa9e9876cbcd013baba02900b8979d43fe208a4a4f339f5fd6007e74cd82e037b800186422fc2da167c747ef045e5d18a5f5d4300f8e1a0291c"
        ).expect("could not parse signature");
        assert_eq!(
            signature.recover("Some data").unwrap(),
            Address::from_str("2c7536E3605D9C16a7a3D7b1898e529396a65c23").unwrap()
        );
    }

    #[test]
    fn signature_from_str() {
        let s1 = Signature::from_str(
            "0xaa231fbe0ed2b5418e6ba7c19bee2522852955ec50996c02a2fe3e71d30ddaf1645baf4823fea7cb4fcc7150842493847cfb6a6d63ab93e8ee928ee3f61f503500"
        ).expect("could not parse 0x-prefixed signature");

        let s2 = Signature::from_str(
            "aa231fbe0ed2b5418e6ba7c19bee2522852955ec50996c02a2fe3e71d30ddaf1645baf4823fea7cb4fcc7150842493847cfb6a6d63ab93e8ee928ee3f61f503500"
        ).expect("could not parse non-prefixed signature");

        assert_eq!(s1, s2);
    }
}
