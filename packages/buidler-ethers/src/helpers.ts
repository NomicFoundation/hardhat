import { readArtifact } from "@nomiclabs/buidler/plugins";
import { BuidlerRuntimeEnvironment } from "@nomiclabs/buidler/types";
import { ethers } from "ethers";

export async function getSigners(bre: BuidlerRuntimeEnvironment) {
  const accounts = await bre.ethers.provider.listAccounts();
  return accounts.map((account: string) =>
    bre.ethers.provider.getSigner(account)
  );
}

export function getContractFactory(
  bre: BuidlerRuntimeEnvironment,
  name: string,
  signer?: ethers.Signer
): Promise<ethers.ContractFactory>;

export function getContractFactory(
  bre: BuidlerRuntimeEnvironment,
  abi: any[],
  bytecode: ethers.utils.Arrayish | string,
  signer?: ethers.Signer
): Promise<ethers.ContractFactory>;

export async function getContractFactory(
  bre: BuidlerRuntimeEnvironment,
  nameOrAbi: string | any[],
  bytecodeOrSigner?: ethers.Signer | ethers.utils.Arrayish | string,
  signer?: ethers.Signer
) {
  if (typeof nameOrAbi === "string") {
    return getContractFactoryByName(bre, nameOrAbi, bytecodeOrSigner as
      | ethers.Signer
      | undefined);
  }

  return getContractFactoryByAbiAndBytecode(
    bre,
    nameOrAbi,
    bytecodeOrSigner as ethers.utils.Arrayish | string,
    signer
  );
}

export async function getContractFactoryByName(
  bre: BuidlerRuntimeEnvironment,
  name: string,
  signer?: ethers.Signer
) {
  if (signer === undefined) {
    const signers = await bre.ethers.signers();
    signer = signers[0];
  }

  const artifact = await readArtifact(bre.config.paths.artifacts, name);
  const bytecode = artifact.bytecode;
  return new bre.ethers.ContractFactory(artifact.abi, bytecode, signer);
}

export async function getContractFactoryByAbiAndBytecode(
  bre: BuidlerRuntimeEnvironment,
  abi: any[],
  bytecode: ethers.utils.Arrayish | string,
  signer?: ethers.Signer
) {
  if (signer === undefined) {
    const signers = await bre.ethers.signers();
    signer = signers[0];
  }

  return new bre.ethers.ContractFactory(abi, bytecode, signer);
}

export async function getContractAt(
  bre: BuidlerRuntimeEnvironment,
  nameOrAbi: string | any[],
  address: string,
  signer?: ethers.Signer
) {
  if (typeof nameOrAbi === "string") {
    const factory = await getContractFactoryByName(bre, nameOrAbi, signer);
    return factory.attach(address);
  }

  if (signer === undefined) {
    const signers = await bre.ethers.signers();
    signer = signers[0];
  }

  return new bre.ethers.Contract(address, nameOrAbi, signer);
}
