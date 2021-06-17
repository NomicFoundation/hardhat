import { rawDecode } from "ethereumjs-abi";
import { BN } from "ethereumjs-util";

export function panicErrorCodeToMessage(errorCode: BN): string {
  const reason = panicErrorCodeToReason(errorCode);

  if (reason !== undefined) {
    return `reverted with panic code 0x${errorCode.toString(16)} (${reason})`;
  }

  return `reverted with unknown panic code 0x${errorCode.toString(16)}`;
}

function panicErrorCodeToReason(errorCode: BN): string | undefined {
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
