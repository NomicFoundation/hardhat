use crate::{signature::Signature, Address, U256};

// Must match the Hardhat implementation to make sure that transaction hashes
// and by extension block hashes match for identical input.
// Hardhat legacy and EIP-155 sender transactions use `v` value 0 while EIP-1559
// and EIP-2930 transactions use `v` value 1.
pub(super) fn make_fake_signature<const V: usize>(sender: &Address) -> Signature {
    // The only requirements on a fake signature are that when it is encoded as part
    // of a transaction, it produces the same hash for the same transaction from
    // a sender, and it produces different hashes for different senders. We
    // achieve this by setting the `r` and `s` values to the sender's address.
    // This is the simplest implementation and it helps us recognize
    // fake signatures in debug logs.

    // We interpret the hash as a big endian U256 value.
    let r = U256::try_from_be_slice(sender.as_slice())
        .expect("address is 20 bytes which fits into U256");
    let s = U256::try_from_be_slice(sender.as_slice())
        .expect("address is 20 bytes which fits into U256");

    // Recovery id for fake signatures is unsupported, so we always set it to the
    // one that Hardhat is using. We add the +27 magic number that originates
    // from Bitcoin as the `Signature::new` function adds it as well.
    let v = V as u64 + 27;

    Signature { r, s, v }
}

#[cfg(test)]
pub(super) mod tests {
    macro_rules! test_fake_sign_properties {
        () => {
            #[test]
            fn hash_with_fake_signature_same_sender() {
                let transaction_request = dummy_request();

                let sender = Address::from(revm_primitives::ruint::aliases::U160::from(1));

                let signed_transaction_one = transaction_request.clone().fake_sign(&sender);
                let signed_transaction_two = transaction_request.fake_sign(&sender);

                let hash_one = signed_transaction_one.hash();
                let hash_two = signed_transaction_two.hash();

                assert_eq!(hash_one, hash_two);
            }

            #[test]
            fn hash_with_fake_signature_different_senders() {
                let transaction_request = dummy_request();

                let sender_one = Address::from(revm_primitives::ruint::aliases::U160::from(1));
                let sender_two = Address::from(revm_primitives::ruint::aliases::U160::from(2));

                let signed_transaction_one = transaction_request.clone().fake_sign(&sender_one);
                let signed_transaction_two = transaction_request.fake_sign(&sender_two);

                let hash_one = signed_transaction_one.hash();
                let hash_two = signed_transaction_two.hash();

                assert_ne!(hash_one, hash_two);
            }
        };
    }

    //  Needs to be `pub(crate`), otherwise export doesn't work.
    pub(crate) use test_fake_sign_properties;
}
