import type { ContractInformation } from "./contract.js";
import type { Etherscan } from "./etherscan.js";

import { sleep } from "@nomicfoundation/hardhat-utils/lang";

interface AttemptVerificationArgs {
  verificationProvider: Etherscan;
  address: string;
  encodedConstructorArgs: string;
  contractInformation: ContractInformation;
}

interface VerificationResponse {
  success: boolean;
  message: string;
}

export async function attemptVerification({
  verificationProvider,
  address,
  encodedConstructorArgs,
  contractInformation,
}: AttemptVerificationArgs): Promise<VerificationResponse> {
  const guid = await verificationProvider.verify(
    address,
    JSON.stringify(contractInformation.compilerInput),
    contractInformation.contract,
    `v${contractInformation.solcLongVersion}`,
    encodedConstructorArgs,
  );

  console.log(`Successfully submitted source code for contract
${contractInformation.contract} at ${address}
for verification on ${verificationProvider.name}. Waiting for verification result...
`);

  await sleep(0.5); // Wait half a second before polling

  const verificationStatus = await verificationProvider.pollVerificationStatus(
    guid,
    address,
    contractInformation.contract,
  );

  return {
    success: verificationStatus.isSuccess(),
    message: verificationStatus.message,
  };
}
