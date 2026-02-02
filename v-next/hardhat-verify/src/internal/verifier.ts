import type { VerifierHelpers } from "../types.js";
import type { LazyEtherscan } from "./etherscan.types.js";
import type {
  ChainDescriptorsConfig,
  VerificationProvidersConfig,
} from "hardhat/types/config";
import type { EthereumProvider } from "hardhat/types/providers";

import { LazyEtherscanImpl } from "./etherscan.js";

export class Verifier implements VerifierHelpers {
  public readonly etherscan: LazyEtherscan;

  constructor(
    provider: EthereumProvider,
    networkName: string,
    chainDescriptors: ChainDescriptorsConfig,
    verificationProvidersConfig: VerificationProvidersConfig,
  ) {
    this.etherscan = new LazyEtherscanImpl(
      provider,
      networkName,
      chainDescriptors,
      verificationProvidersConfig,
    );
  }
}
