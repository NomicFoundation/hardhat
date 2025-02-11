// TODO: HH3 Bring this file back with Hardhat Verify
// import type { Etherscan } from "@nomicfoundation/hardhat-verify/etherscan";
// import type { VerifyInfo } from "@ignored/hardhat-vnext-ignition-core";

// export async function verifyEtherscanContract(
//   etherscanInstance: Etherscan,
//   { address, compilerVersion, sourceCode, name, args }: VerifyInfo
// ): Promise<
//   { type: "success"; contractURL: string } | { type: "failure"; reason: Error }
// > {
//   try {
//     const { message: guid } = await etherscanInstance.verify(
//       address,
//       sourceCode,
//       name,
//       compilerVersion,
//       args
//     );

//     const verificationStatus = await etherscanInstance.getVerificationStatus(
//       guid
//     );

//     if (verificationStatus.isSuccess()) {
//       const contractURL = etherscanInstance.getContractUrl(address);
//       return { type: "success", contractURL };
//     } else {
//       // todo: what case would cause verification status not to succeed without throwing?
//       return { type: "failure", reason: new Error(verificationStatus.message) };
//     }
//   } catch (e) {
//     if (e instanceof Error) {
//       return { type: "failure", reason: e };
//     } else {
//       throw e;
//     }
//   }
// }
