#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, PartialOrd)]
#[allow(dead_code)]
pub enum Opcode {
    // Arithmetic operations
    Stop = 0x00,
    Add = 0x01,
    Mul = 0x02,
    Sub = 0x03,
    Div = 0x04,
    Sdiv = 0x05,
    Mod = 0x06,
    Smod = 0x07,
    Addmod = 0x08,
    Mulmod = 0x09,
    Exp = 0x0a,
    SignExtend = 0x0b,

    // Unallocated
    Unrecognized0C = 0x0c,
    Unrecognized0D = 0x0d,
    Unrecognized0E = 0x0e,
    Unrecognized0F = 0x0f,

    // Comparison and bitwise operations
    Lt = 0x10,
    Gt = 0x11,
    Slt = 0x12,
    Sgt = 0x13,
    Eq = 0x14,
    IsZero = 0x15,
    And = 0x16,
    Or = 0x17,
    Xor = 0x18,
    Not = 0x19,
    Byte = 0x1a,
    Shl = 0x1b,
    Shr = 0x1c,
    Sar = 0x1d,

    // Unallocated
    Unrecognized1E = 0x1e,
    Unrecognized1F = 0x1f,

    // Cryptographic operations
    Sha3 = 0x20,

    // Unallocated
    Unrecognized21 = 0x21,
    Unrecognized22 = 0x22,
    Unrecognized23 = 0x23,
    Unrecognized24 = 0x24,
    Unrecognized25 = 0x25,
    Unrecognized26 = 0x26,
    Unrecognized27 = 0x27,
    Unrecognized28 = 0x28,
    Unrecognized29 = 0x29,
    Unrecognized2A = 0x2a,
    Unrecognized2B = 0x2b,
    Unrecognized2C = 0x2c,
    Unrecognized2D = 0x2d,
    Unrecognized2E = 0x2e,
    Unrecognized2F = 0x2f,

    // Message info operations
    Address = 0x30,
    Balance = 0x31,
    Origin = 0x32,
    Caller = 0x33,
    CallValue = 0x34,
    CallDataLoad = 0x35,
    CallDataSize = 0x36,
    CallDataCopy = 0x37,
    CodeSize = 0x38,
    CodeCopy = 0x39,
    GasPrice = 0x3a,
    ExtCodeSize = 0x3b,
    ExtCodeCopy = 0x3c,
    ReturnDataSize = 0x3d,
    ReturnDataCopy = 0x3e,
    ExtCodeHash = 0x3f,

    // Block info operations
    BlockHash = 0x40,
    Coinbase = 0x41,
    Timestamp = 0x42,
    Number = 0x43,
    Difficulty = 0x44,
    GasLimit = 0x45,

    // Istanbul opcodes
    ChainId = 0x46,
    SelfBalance = 0x47,

    // London opcodes
    BaseFee = 0x48,

    // Unallocated
    Unrecognized49 = 0x49,
    Unrecognized4A = 0x4a,
    Unrecognized4B = 0x4b,
    Unrecognized4C = 0x4c,
    Unrecognized4D = 0x4d,
    Unrecognized4E = 0x4e,
    Unrecognized4F = 0x4f,

    // Storage, memory, and other operations
    Pop = 0x50,
    Mload = 0x51,
    Mstore = 0x52,
    Mstore8 = 0x53,
    Sload = 0x54,
    Sstore = 0x55,
    Jump = 0x56,
    Jumpi = 0x57,
    Pc = 0x58,
    Msize = 0x59,
    Gas = 0x5a,
    JumpDest = 0x5b,

    // Uncallocated
    Unrecognized5C = 0x5c,
    Unrecognized5D = 0x5d,
    Unrecognized5E = 0x5e,
    Unrecognized5F = 0x5f,

    // Push operations
    Push1 = 0x60,
    Push2 = 0x61,
    Push3 = 0x62,
    Push4 = 0x63,
    Push5 = 0x64,
    Push6 = 0x65,
    Push7 = 0x66,
    Push8 = 0x67,
    Push9 = 0x68,
    Push10 = 0x69,
    Push11 = 0x6a,
    Push12 = 0x6b,
    Push13 = 0x6c,
    Push14 = 0x6d,
    Push15 = 0x6e,
    Push16 = 0x6f,
    Push17 = 0x70,
    Push18 = 0x71,
    Push19 = 0x72,
    Push20 = 0x73,
    Push21 = 0x74,
    Push22 = 0x75,
    Push23 = 0x76,
    Push24 = 0x77,
    Push25 = 0x78,
    Push26 = 0x79,
    Push27 = 0x7a,
    Push28 = 0x7b,
    Push29 = 0x7c,
    Push30 = 0x7d,
    Push31 = 0x7e,
    Push32 = 0x7f,

    // Dup operations
    Dup1 = 0x80,
    Dup2 = 0x81,
    Dup3 = 0x82,
    Dup4 = 0x83,
    Dup5 = 0x84,
    Dup6 = 0x85,
    Dup7 = 0x86,
    Dup8 = 0x87,
    Dup9 = 0x88,
    Dup10 = 0x89,
    Dup11 = 0x8a,
    Dup12 = 0x8b,
    Dup13 = 0x8c,
    Dup14 = 0x8d,
    Dup15 = 0x8e,
    Dup16 = 0x8f,

    // Swap operations
    Swap1 = 0x90,
    Swap2 = 0x91,
    Swap3 = 0x92,
    Swap4 = 0x93,
    Swap5 = 0x94,
    Swap6 = 0x95,
    Swap7 = 0x96,
    Swap8 = 0x97,
    Swap9 = 0x98,
    Swap10 = 0x99,
    Swap11 = 0x9a,
    Swap12 = 0x9b,
    Swap13 = 0x9c,
    Swap14 = 0x9d,
    Swap15 = 0x9e,
    Swap16 = 0x9f,

    // Log operations
    Log0 = 0xa0,
    Log1 = 0xa1,
    Log2 = 0xa2,
    Log3 = 0xa3,
    Log4 = 0xa4,

    // Unallocated
    UnrecognizedA5 = 0xa5,
    UnrecognizedA6 = 0xa6,
    UnrecognizedA7 = 0xa7,
    UnrecognizedA8 = 0xa8,
    UnrecognizedA9 = 0xa9,
    UnrecognizedAA = 0xaa,
    UnrecognizedAB = 0xab,
    UnrecognizedAC = 0xac,
    UnrecognizedAD = 0xad,
    UnrecognizedAE = 0xae,
    UnrecognizedAF = 0xaf,

    UnrecognizedB0 = 0xb0,
    UnrecognizedB1 = 0xb1,
    UnrecognizedB2 = 0xb2,
    UnrecognizedB3 = 0xb3,
    UnrecognizedB4 = 0xb4,
    UnrecognizedB5 = 0xb5,
    UnrecognizedB6 = 0xb6,
    UnrecognizedB7 = 0xb7,
    UnrecognizedB8 = 0xb8,
    UnrecognizedB9 = 0xb9,
    UnrecognizedBA = 0xba,
    UnrecognizedBB = 0xbb,
    UnrecognizedBC = 0xbc,
    UnrecognizedBD = 0xbd,
    UnrecognizedBE = 0xbe,
    UnrecognizedBF = 0xbf,

    UnrecognizedC0 = 0xc0,
    UnrecognizedC1 = 0xc1,
    UnrecognizedC2 = 0xc2,
    UnrecognizedC3 = 0xc3,
    UnrecognizedC4 = 0xc4,
    UnrecognizedC5 = 0xc5,
    UnrecognizedC6 = 0xc6,
    UnrecognizedC7 = 0xc7,
    UnrecognizedC8 = 0xc8,
    UnrecognizedC9 = 0xc9,
    UnrecognizedCA = 0xca,
    UnrecognizedCB = 0xcb,
    UnrecognizedCC = 0xcc,
    UnrecognizedCD = 0xcd,
    UnrecognizedCE = 0xce,
    UnrecognizedCF = 0xcf,

    UnrecognizedD0 = 0xd0,
    UnrecognizedD1 = 0xd1,
    UnrecognizedD2 = 0xd2,
    UnrecognizedD3 = 0xd3,
    UnrecognizedD4 = 0xd4,
    UnrecognizedD5 = 0xd5,
    UnrecognizedD6 = 0xd6,
    UnrecognizedD7 = 0xd7,
    UnrecognizedD8 = 0xd8,
    UnrecognizedD9 = 0xd9,
    UnrecognizedDA = 0xda,
    UnrecognizedDB = 0xdb,
    UnrecognizedDC = 0xdc,
    UnrecognizedDD = 0xdd,
    UnrecognizedDE = 0xde,
    UnrecognizedDF = 0xdf,

    UnrecognizedE0 = 0xe0,
    UnrecognizedE1 = 0xe1,
    UnrecognizedE2 = 0xe2,
    UnrecognizedE3 = 0xe3,
    UnrecognizedE4 = 0xe4,
    UnrecognizedE5 = 0xe5,
    UnrecognizedE6 = 0xe6,
    UnrecognizedE7 = 0xe7,
    UnrecognizedE8 = 0xe8,
    UnrecognizedE9 = 0xe9,
    UnrecognizedEA = 0xea,
    UnrecognizedEB = 0xeb,
    UnrecognizedEC = 0xec,
    UnrecognizedED = 0xed,
    UnrecognizedEE = 0xee,
    UnrecognizedEF = 0xef,

    // Call operations
    Create = 0xf0,
    Call = 0xf1,
    CallCode = 0xf2,
    Return = 0xf3,
    DelegateCall = 0xf4,
    Create2 = 0xf5,

    // Unallocated
    UnrecognizedF6 = 0xf6,
    UnrecognizedF7 = 0xf7,
    UnrecognizedF8 = 0xf8,
    UnrecognizedF9 = 0xf9,

    // Other operations
    StaticCall = 0xfa,

    // Unallocated
    UnrecognizedFB = 0xfb,
    UnrecognizedFC = 0xfc,

    // Other operations
    Revert = 0xfd,
    Invalid = 0xfe,
    Selfdestruct = 0xff,
}

impl From<u8> for Opcode {
    fn from(v: u8) -> Self {
        // we can do this because opcode has variants for all u8 values; check test
        // below
        unsafe { std::mem::transmute(v) }
    }
}

fn is_push(opcode: Opcode) -> bool {
    opcode >= Opcode::Push1 && opcode <= Opcode::Push32
}

fn get_push_length(opcode: Opcode) -> usize {
    (opcode as usize) - (Opcode::Push1 as usize) + 1
}

pub fn get_opcode_length(opcode: Opcode) -> usize {
    if !is_push(opcode) {
        return 1;
    }

    1 + get_push_length(opcode)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn check_opcode_enum_is_exhaustive() {
        // we should be able to convert any u8 value into an opcode
        for i in 0..=255 {
            let _: Opcode = i.into();
        }
    }
}
