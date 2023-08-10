export const REVERT_REASON_SIGNATURE = "0x08c379a0";
export const PANIC_CODE_SIGNATURE = "0x4e487b71";
export const PANIC_CODE_NAMES: { [key: number]: string | undefined } = {
  [0x00]: "GENERIC_PANIC",
  [0x01]: "ASSERT_FALSE",
  [0x11]: "OVERFLOW",
  [0x12]: "DIVIDE_BY_ZERO",
  [0x21]: "ENUM_RANGE_ERROR",
  [0x22]: "BAD_STORAGE_DATA",
  [0x31]: "STACK_UNDERFLOW",
  [0x32]: "ARRAY_RANGE_ERROR",
  [0x41]: "OUT_OF_MEMORY",
  [0x51]: "UNINITIALIZED_FUNCTION_CALL",
};
