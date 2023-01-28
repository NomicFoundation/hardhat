//! NAPI bindings for the Rethnet EVM
#![warn(missing_docs)]

mod access_list;
mod account;
mod block;
mod blockchain;
mod cast;
mod config;
mod log;
mod receipt;
mod runtime;
mod state;
mod sync;
mod threadsafe_function;
mod trace;
mod tracer;
mod transaction;

use std::str::FromStr;

use napi::Status;
use rethnet_eth::Address;
use secp256k1::{PublicKey, Secp256k1, SecretKey, SignOnly};
use sha3::{Digest, Keccak256};

use crate::cast::TryCast;

fn private_key_to_address(
    context: &Secp256k1<SignOnly>,
    private_key: String,
) -> napi::Result<Address> {
    private_to_public_key(context, private_key).map(public_key_to_address)
}

fn private_to_public_key(
    context: &Secp256k1<SignOnly>,
    private_key: String,
) -> napi::Result<secp256k1::PublicKey> {
    let private_key = private_key.strip_prefix("0x").unwrap_or(&private_key);

    SecretKey::from_str(private_key).map_or_else(
        |e| Err(napi::Error::new(Status::InvalidArg, e.to_string())),
        |secret_key| Ok(secret_key.public_key(context)),
    )
}

fn public_key_to_address(public_key: PublicKey) -> Address {
    let hash = Keccak256::digest(&public_key.serialize_uncompressed()[1..]);
    // Only take the lower 160 bits of the hash
    Address::from_slice(&hash[12..])
}
