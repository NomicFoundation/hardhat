import { EIP1193Provider } from "hardhat/types";

// TODO: This are not ready. Do we need more? We also need to encode the value.
export interface CallParams {
  to?: string;
  // value: bigint;
  data: string;
  // from: string;
}

/**
 * The error returned by `call`, if any.
 */
export interface CallErrorResult {
  returnData: string;
  isCustomError: boolean;
}

/**
 * Performs an `eth_call` JSON-RPC request, and returns the result or an error
 * object with the return data and a boolean indicating if the request failed
 * with an error message that telling that the call failed with a custom error.
 *
 * @param provider An EIP-1193 provider to perform the call.
 * @param callParams The params for the call.
 * @param blockTag The block tag to use for the call.
 */
export async function call(
  provider: EIP1193Provider,
  callParams: CallParams,
  blockTag: "latest" | "pending"
): Promise<string | CallErrorResult> {
  try {
    const response = await provider.request({
      method: "eth_call",
      params: [callParams, blockTag],
    });

    if (typeof response !== "string") {
      throw new Error("Invalid response " + response);
    }

    return response;
  } catch (error) {
    if (
      error instanceof Error &&
      "data" in error &&
      typeof error.data === "string"
    ) {
      return {
        returnData: error.data,
        isCustomError: isCustomErrorError(error),
      };
    }

    if (error instanceof Error && "code" in error) {
      if (error.code == -32000) {
        return {
          returnData: "0x",
          isCustomError: false,
        };
      }
    }

    throw error;
  }
}

/**
 * A function that returns true if an error thrown by a provider is an
 * execution failure due to a custom error.
 *
 * There are situations where a node may know that an error comes from
 * a custom error, yet we don't have the ABI to decode it. In those cases
 * we want to keep track of the information that the error was a custom error.
 *
 * @param error An error thrown by the provider.
 */
function isCustomErrorError(error: Error): boolean {
  return error.message.includes(" reverted with custom error ");
}
