import type { ethers } from "ethers";

export interface ExtendedEthersSigner extends ethers.Signer {
  address: string;
}
