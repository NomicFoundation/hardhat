import { rawDecode } from "ethereumjs-abi";
import { BN } from "ethereumjs-util";

export function panicErrorCodeToReason(errorCode: BN): string {
  switch (errorCode.toString()) {
    case (0x01).toString():
      return "Assertion error";
    case (0x11).toString():
      return "Arithmetic operation underflowed or overflowed outside of an unchecked block";
    case (0x12).toString():
      return "Division or modulo division by zero";
    case (0x21).toString():
      return "Tried to convert a value into an enum, but the value was too big or negative";
    case (0x22).toString():
      return "Incorrectly encoded storage byte array";
    case (0x31).toString():
      return ".pop() was called on an empty array";
    case (0x32).toString():
      return "Array accessed at an out-of-bounds or negative index";
    case (0x41).toString():
      return "Too much memory was allocated, or an array was created that is too large";
    case (0x51).toString():
      return "Called a zero-initialized variable of internal function type";
    default:
      return "Unrecognized panic error";
  }
}
