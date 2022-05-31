import type { BigNumber } from "ethers";

export const PANIC_CODES = {
  ASSERTION_ERROR: 0x1,
  ARITHMETIC_UNDER_OR_OVERFLOW: 0x11,
  DIVISION_BY_ZERO: 0x12,
  ENUM_CONVERSION_OUT_OF_BOUNDS: 0x21,
  INCORRECTLY_ENCODED_STORAGE_BYTE_ARRAY: 0x22,
  POP_ON_EMPTY_ARRAY: 0x31,
  ARRAY_ACCESS_OUT_OF_BOUNDS: 0x32,
  TOO_MUCH_MEMORY_ALLOCATED: 0x41,
  ZERO_INITIALIZED_VARIABLE: 0x51,
};

// copied from hardhat-core
export function panicErrorCodeToReason(
  errorCode: BigNumber
): string | undefined {
  switch (errorCode.toNumber()) {
    case 0x1:
      return "Assertion error";
    case 0x11:
      return "Arithmetic operation underflowed or overflowed outside of an unchecked block";
    case 0x12:
      return "Division or modulo division by zero";
    case 0x21:
      return "Tried to convert a value into an enum, but the value was too big or negative";
    case 0x22:
      return "Incorrectly encoded storage byte array";
    case 0x31:
      return ".pop() was called on an empty array";
    case 0x32:
      return "Array accessed at an out-of-bounds or negative index";
    case 0x41:
      return "Too much memory was allocated, or an array was created that is too large";
    case 0x51:
      return "Called a zero-initialized variable of internal function type";
  }
}
