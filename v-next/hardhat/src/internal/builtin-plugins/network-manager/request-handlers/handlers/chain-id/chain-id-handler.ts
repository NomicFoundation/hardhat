import type {
  EthereumProvider,
  JsonRpcRequest,
  JsonRpcResponse,
} from "../../../../../../types/providers.js";
import type { RequestHandler } from "../../types.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { ChainId } from "./chain-id.js";

/**
 * This class validates that the current provider's chain ID matches
 * an expected value. If the actual chain ID differs from the expected one, it throws a
 * HardhatError to signal a network configuration mismatch. Once validated, further checks
 * are skipped to avoid redundant validations.
 */
export class ChainIdValidatorHandler extends ChainId implements RequestHandler {
  readonly #expectedChainId: number;
  #alreadyValidated = false;

  constructor(provider: EthereumProvider, expectedChainId: number) {
    super(provider);

    this.#expectedChainId = expectedChainId;
  }

  public async handle(
    jsonRpcRequest: JsonRpcRequest,
  ): Promise<JsonRpcRequest | JsonRpcResponse> {
    if (
      jsonRpcRequest.method === "eth_chainId" ||
      jsonRpcRequest.method === "net_version"
    ) {
      return jsonRpcRequest;
    }

    if (this.#alreadyValidated) {
      return jsonRpcRequest;
    }

    const actualChainId = await this.getChainId();

    if (actualChainId !== this.#expectedChainId) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.NETWORK.INVALID_GLOBAL_CHAIN_ID,
        {
          configChainId: this.#expectedChainId,
          connectionChainId: actualChainId,
        },
      );
    }

    this.#alreadyValidated = true;

    return jsonRpcRequest;
  }
}
