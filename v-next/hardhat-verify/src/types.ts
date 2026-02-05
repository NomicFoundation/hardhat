import type { LazyEtherscan } from "./internal/etherscan.types.js";

export interface VerifierHelpers {
  readonly etherscan: LazyEtherscan;
}

export type {
  EtherscanVerifyArgs,
  EtherscanCustomApiCallOptions,
  EtherscanResponseBody,
  LazyEtherscan as Etherscan,
} from "./internal/etherscan.types.js";
