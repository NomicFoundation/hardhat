use napi_derive::napi;

#[napi(string_enum)]
#[doc = "The type of ordering to use when selecting blocks to mine."]
pub enum MineOrdering {
    #[doc = "Insertion order"]
    Fifo,
    #[doc = "Effective miner fee"]
    Priority,
}

impl From<MineOrdering> for edr_evm::MineOrdering {
    fn from(value: MineOrdering) -> Self {
        match value {
            MineOrdering::Fifo => Self::Fifo,
            MineOrdering::Priority => Self::Priority,
        }
    }
}
