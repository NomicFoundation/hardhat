import { IgnitionError } from "@nomicfoundation/ignition-core";

/* 
  This is a whitelist of error codes that should be rethrown as NomicLabsHardhatPluginError.
 */
const whitelist = ["600", "601", "800"];

export function shouldBeHardhatPluginError(error: IgnitionError): boolean {
  const code = error.message.match(/IGN([0-9]+):/)![1];

  return whitelist.includes(code);
}
