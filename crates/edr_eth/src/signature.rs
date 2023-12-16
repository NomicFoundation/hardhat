// Part of this code was adapted from ethers-rs and is distributed under their
// licenss:
// - https://github.com/gakonst/ethers-rs/blob/cba6f071aedafb766e82e4c2f469ed5e4638337d/LICENSE-APACHE
// - https://github.com/gakonst/ethers-rs/blob/cba6f071aedafb766e82e4c2f469ed5e4638337d/LICENSE-MIT
// For the original context see: https://github.com/gakonst/ethers-rs/blob/cba6f071aedafb766e82e4c2f469ed5e4638337d/ethers-core/src/types/signature.rs

use core::fmt;
#[cfg(feature = "std")]
use std::str::FromStr;

use alloy_rlp::BufMut;
use k256::{
    ecdsa::{
        signature::hazmat::PrehashSigner, RecoveryId, Signature as ECDSASignature, SigningKey,
        VerifyingKey,
    },
    elliptic_curve::sec1::ToEncodedPoint,
    FieldBytes, PublicKey, SecretKey,
};
use sha3::{Digest, Keccak256};

use crate::{utils::hash_message, Address, B256, U256};

/// Converts a [`PublicKey`] to an [`Address`].
pub fn public_key_to_address(public_key: PublicKey) -> Address {
    let public_key = public_key.to_encoded_point(/* compress = */ false);
    let hash = Keccak256::digest(&public_key.as_bytes()[1..]);
    // Only take the lower 160 bits of the hash
    Address::from_slice(&hash[12..])
}

/// Converts a secret key in a hex string format to an address.
///
/// # Examples
///
/// ```
/// use edr_eth::signature::secret_key_to_address;
///
/// let secret_key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
///
/// let address = secret_key_to_address(secret_key).unwrap();
/// ```
pub fn secret_key_to_address(secret_key: &str) -> Result<Address, SignatureError> {
    let secret_key = secret_key_from_str(secret_key)?;
    Ok(public_key_to_address(secret_key.public_key()))
}

/// Converts a hex string to a secret key.
pub fn secret_key_from_str(secret_key: &str) -> Result<SecretKey, SignatureError> {
    let secret_key = if let Some(stripped) = secret_key.strip_prefix("0x") {
        hex::decode(stripped)
    } else {
        hex::decode(secret_key)
    }
    .map_err(SignatureError::DecodingError)?;
    let secret_key = FieldBytes::from_exact_iter(secret_key.into_iter()).ok_or_else(|| {
        SignatureError::InvalidSecretKey("expected 32 byte secret key".to_string())
    })?;
    SecretKey::from_bytes(&secret_key).map_err(SignatureError::EllipticCurveError)
}

/// An error involving a signature.
#[derive(Debug)]
#[cfg_attr(feature = "std", derive(thiserror::Error))]
pub enum SignatureError {
    /// Invalid length, ECDSA secp256k1 signatures with recovery are 65 bytes
    #[cfg_attr(
        feature = "std",
        error("invalid signature length, got {0}, expected 65")
    )]
    InvalidLength(usize),
    /// Invalid secret key.
    #[cfg_attr(feature = "std", error("Invalid secret key: {0}"))]
    InvalidSecretKey(String),
    /// When parsing a signature from string to hex
    #[cfg_attr(feature = "std", error(transparent))]
    DecodingError(#[cfg_attr(feature = "std", from)] hex::FromHexError),
    /// Thrown when signature verification failed (i.e. when the address that
    /// produced the signature did not match the expected address)
    #[cfg_attr(
        feature = "std",
        error("Signature verification failed. Expected {0}, got {1}")
    )]
    VerificationError(Address, Address),
    /// ECDSA error
    #[cfg_attr(feature = "std", error(transparent))]
    ECDSAError(#[cfg_attr(feature = "std", from)] k256::ecdsa::signature::Error),
    /// Elliptic curve error
    #[cfg_attr(feature = "std", error(transparent))]
    EllipticCurveError(#[cfg_attr(feature = "std", from)] k256::elliptic_curve::Error),
    /// Error in recovering public key from signature
    #[cfg_attr(feature = "std", error("Public key recovery error"))]
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
    Hash(B256),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash)]
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
    /// Constructs a new signature from a message and secret key.
    /// To obtain the hash of a message consider [`hash_message`].
    pub fn new<M>(message: M, secret_key: &SecretKey) -> Result<Self, SignatureError>
    where
        M: Into<RecoveryMessage>,
    {
        let message = message.into();
        let message_hash = match message {
            RecoveryMessage::Data(ref message) => hash_message(message),
            RecoveryMessage::Hash(hash) => hash,
        };

        let signing_key: SigningKey = secret_key.into();
        let (signature, recovery_id) = PrehashSigner::<(ECDSASignature, RecoveryId)>::sign_prehash(
            &signing_key,
            &*message_hash,
        )
        .map_err(SignatureError::ECDSAError)?;

        let r = U256::try_from_be_slice(&Into::<FieldBytes>::into(signature.r()))
            .expect("Must be valid");
        let s = U256::try_from_be_slice(&Into::<FieldBytes>::into(signature.s()))
            .expect("Must be valid");
        let v = 27 + u64::from(Into::<u8>::into(recovery_id));

        Ok(Self { r, s, v })
    }

    /// Returns whether the V value has odd Y parity.
    pub fn odd_y_parity(&self) -> bool {
        self.v == 28
    }

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
    pub fn recover<M>(&self, message: M) -> Result<Address, SignatureError>
    where
        M: Into<RecoveryMessage>,
    {
        let message = message.into();
        let message_hash = match message {
            RecoveryMessage::Data(ref message) => hash_message(message),
            RecoveryMessage::Hash(hash) => hash,
        };

        let (signature, recovery_id) = self.as_signature()?;

        let verifying_key =
            VerifyingKey::recover_from_prehash(message_hash.as_bytes(), &signature, recovery_id)
                .map_err(SignatureError::ECDSAError)?;

        Ok(public_key_to_address(verifying_key.into()))
    }

    /// Retrieves the recovery signature.
    fn as_signature(&self) -> Result<(ECDSASignature, RecoveryId), SignatureError> {
        let recovery_id = self.recovery_id()?;
        let signature = {
            let r_bytes = self.r.to_be_bytes::<32>();
            let s_bytes = self.s.to_be_bytes::<32>();

            let mut bytes = [0u8; 64];
            bytes[..32].copy_from_slice(&r_bytes);
            bytes[32..64].copy_from_slice(&s_bytes);
            ECDSASignature::from_slice(&bytes).map_err(SignatureError::ECDSAError)?
        };

        Ok((signature, recovery_id))
    }

    /// Retrieve the recovery ID.
    pub fn recovery_id(&self) -> Result<RecoveryId, SignatureError> {
        let standard_v = normalize_recovery_id(self.v);
        RecoveryId::try_from(standard_v).map_err(SignatureError::ECDSAError)
    }

    /// Copies and serializes `self` into a new `Vec` with the recovery id
    /// included
    #[allow(clippy::wrong_self_convention)]
    pub fn to_vec(&self) -> Vec<u8> {
        self.into()
    }
}

// We need a custom implementation to avoid the struct being treated as an RLP
// list.
impl alloy_rlp::Decodable for Signature {
    fn decode(buf: &mut &[u8]) -> alloy_rlp::Result<Self> {
        let decode = Self {
            // The order of these fields determines decoding order.
            v: u64::decode(buf)?,
            r: U256::decode(buf)?,
            s: U256::decode(buf)?,
        };

        Ok(decode)
    }
}

// We need a custom implementation to avoid the struct being treated as an RLP
// list.
impl alloy_rlp::Encodable for Signature {
    fn encode(&self, out: &mut dyn BufMut) {
        // The order of these fields determines decoding order.
        self.v.encode(out);
        self.r.encode(out);
        self.s.encode(out);
    }

    fn length(&self) -> usize {
        self.r.length() + self.s.length() + self.v.length()
    }
}

fn normalize_recovery_id(v: u64) -> u8 {
    match v {
        0 | 27 => 0,
        1 | 28 => 1,
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

#[cfg(feature = "std")]
impl FromStr for Signature {
    type Err = SignatureError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let s = s.strip_prefix("0x").unwrap_or(s);
        let bytes = hex::decode(s).map_err(SignatureError::DecodingError)?;
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
        B256::from(hash).into()
    }
}

impl From<B256> for RecoveryMessage {
    fn from(hash: B256) -> Self {
        RecoveryMessage::Hash(hash)
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use super::*;

    #[test]
    fn recover_web3_signature() {
        // test vector taken from:
        // https://web3js.readthedocs.io/en/v1.2.2/web3-eth-accounts.html#sign
        let signature = Signature::from_str(
            "0xb91467e570a6466aa9e9876cbcd013baba02900b8979d43fe208a4a4f339f5fd6007e74cd82e037b800186422fc2da167c747ef045e5d18a5f5d4300f8e1a0291c"
        ).expect("could not parse signature");
        assert_eq!(
            signature.recover("Some data").unwrap(),
            Address::from_str("0x2c7536E3605D9C16a7a3D7b1898e529396a65c23").unwrap()
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

    #[test]
    fn test_secret_key_to_address() {
        // `hardhat node`s default addresses are shown on startup. this is the first
        // one:     Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
        // (10000 ETH)     Secret Key:
        // 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
        // we'll use these as fixtures.

        let expected_address = Address::from_str("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
            .expect("should parse address from string");

        let actual_address = secret_key_to_address(
            "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        )
        .expect("should derive address");
        assert_eq!(actual_address, expected_address);
    }

    #[test]
    fn test_signature_new() {
        fn verify<MsgOrHash>(msg_input: MsgOrHash, hashed_message: B256)
        where
            MsgOrHash: Into<RecoveryMessage>,
        {
            let secret_key_str = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
            let secret_key = secret_key_from_str(secret_key_str).unwrap();

            let signature = Signature::new(msg_input, &secret_key).unwrap();

            let recovered_address = signature.recover(hashed_message).unwrap();

            assert_eq!(
                recovered_address,
                secret_key_to_address(secret_key_str).unwrap()
            );
        }

        let message = "whatever";
        let hashed_message = hash_message(message);

        verify(message, hashed_message);
        verify(hashed_message, hashed_message);
    }
}
