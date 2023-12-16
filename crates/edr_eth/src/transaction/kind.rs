use alloy_rlp::{BufMut, Encodable};
use revm_primitives::Address;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub enum TransactionKind {
    Call(Address),
    Create,
}

impl TransactionKind {
    /// If this transaction is a call this returns the address of the callee
    pub fn as_call(&self) -> Option<&Address> {
        match self {
            TransactionKind::Call(to) => Some(to),
            TransactionKind::Create => None,
        }
    }
}

impl From<Option<Address>> for TransactionKind {
    fn from(value: Option<Address>) -> Self {
        if let Some(address) = value {
            TransactionKind::Call(address)
        } else {
            TransactionKind::Create
        }
    }
}

impl alloy_rlp::Decodable for TransactionKind {
    fn decode(buf: &mut &[u8]) -> alloy_rlp::Result<Self> {
        if !buf.is_empty() && buf[0] == alloy_rlp::EMPTY_STRING_CODE {
            Ok(Self::Create)
        } else {
            Address::decode(buf).map(Self::Call)
        }
    }
}

impl alloy_rlp::Encodable for TransactionKind {
    fn length(&self) -> usize {
        match self {
            TransactionKind::Call(address) => address.length(),
            TransactionKind::Create => [].length(),
        }
    }

    fn encode(&self, out: &mut dyn BufMut) {
        match self {
            TransactionKind::Call(address) => address.encode(out),
            TransactionKind::Create => [].encode(out),
        }
    }
}
