import type { VerificationProviderFactory } from "./types.js";
import type { VerificationProvidersConfig } from "hardhat/types/config";

import { Blockscout } from "./blockscout.js";
import { Etherscan } from "./etherscan.js";
import { Sourcify } from "./sourcify.js";

export const VERIFICATION_PROVIDERS: Record<
  keyof VerificationProvidersConfig,
  VerificationProviderFactory
> = {
  etherscan: Etherscan,
  blockscout: Blockscout,
  sourcify: Sourcify,
};
