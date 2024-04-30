import type { JsonFragmentType, ParamType } from "@ethersproject/abi";

import { AbiError } from "./errors/abi.js";
import { ensureError } from "./errors/catch-utils.js";
import { hexStringToBytes } from "./hex.js";

/**
 * Computes the selector for a given Ethereum function, event, or error based
 * on its name and parameter types.
 * The selector is a unique identifier used to specify the function or event
 * when interacting with the contract.
 *
 * @param name The name of the function, event, or error.
 * @param inputs An array of parameter types for the function, event, or error.
 * @returns The hashed representation of the function's signature.
 * @throws AbiError If the selector cannot be computed. This can occur if an
 * input is not recognized by the @ethersproject/abi library.
 */
export async function computeSelector(
  name: string,
  inputs: Array<string | JsonFragmentType | ParamType>,
): Promise<Uint8Array> {
  try {
    const abi = await import("@ethersproject/abi");

    const fragment = abi.FunctionFragment.from({
      type: "function",
      constant: true,
      name,
      inputs: inputs.map((i) => abi.ParamType.from(i)),
    });
    const selectorHex = abi.Interface.getSighash(fragment);

    // TODO I'm pretty sure this is casted back to a hex string everywhere it's used
    return hexStringToBytes(selectorHex);
  } catch (e) {
    ensureError(e);
    throw new AbiError("Cannot compute selector", e);
  }
}

/**
 * Determines whether the given calldata is valid for the given inputs by
 * attempting to decode it.
 *
 * @param inputs An array of parameter types for the function.
 * @param calldata The calldata to validate.
 * @returns True if the calldata is valid for the given inputs, false otherwise.
 */
export async function isValidCalldata(
  inputs: Array<string | ParamType>,
  calldata: Uint8Array,
): Promise<boolean> {
  try {
    const abi = await import("@ethersproject/abi");
    abi.defaultAbiCoder.decode(inputs, calldata);
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats an array of decoded values into a string representation.
 *
 * This function recursively traverses the input array and its sub-arrays (if
 * any), converting each value into a string.
 * If a value is a string, it is surrounded with quotes. If a value is an
 * array, each element is formatted and joined with commas.
 * All other types of values are converted to a string using the `toString`
 * method.
 *
 * @param values An array of decoded values to format.
 * @returns A string representation of the input array, with each value
 * formatted as described above.
 */
export function formatValues(values: any[]): string {
  return values
    .map((value) => {
      if (Array.isArray(value)) {
        return `[${formatValues(value)}]`;
      }

      if (typeof value === "string") {
        return `"${value}"`;
      }

      return value.toString();
    })
    .join(", ");
}
