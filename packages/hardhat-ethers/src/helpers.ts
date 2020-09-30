import { ethers } from "ethers";
import { HardhatRuntimeEnvironment, NetworkConfig } from "hardhat/types";

export async function getSigners(hre: HardhatRuntimeEnvironment) {
  const accounts = await hre.ethers.provider.listAccounts();
  return accounts.map((account: string) =>
    hre.ethers.provider.getSigner(account)
  );
}

export function getContractFactory(
  hre: HardhatRuntimeEnvironment,
  name: string,
  signer?: ethers.Signer
): Promise<ethers.ContractFactory>;

export function getContractFactory(
  hre: HardhatRuntimeEnvironment,
  abi: any[],
  bytecode: ethers.utils.BytesLike | string,
  signer?: ethers.Signer
): Promise<ethers.ContractFactory>;

export async function getContractFactory(
  hre: HardhatRuntimeEnvironment,
  nameOrAbi: string | any[],
  bytecodeOrSigner?: ethers.Signer | ethers.utils.BytesLike | string,
  signer?: ethers.Signer
) {
  if (typeof nameOrAbi === "string") {
    return getContractFactoryByName(
      hre,
      nameOrAbi,
      bytecodeOrSigner as ethers.Signer | undefined
    );
  }

  return getContractFactoryByAbiAndBytecode(
    hre,
    nameOrAbi,
    bytecodeOrSigner as ethers.utils.BytesLike | string,
    signer
  );
}

export async function getContractFactoryByName(
  hre: HardhatRuntimeEnvironment,
  name: string,
  signer?: ethers.Signer
) {
  const artifact = await hre.artifacts.readArtifact(name);
  return getContractFactoryByAbiAndBytecode(
    hre,
    artifact.abi,
    artifact.bytecode,
    signer
  );
}

export async function getContractFactoryByAbiAndBytecode(
  hre: HardhatRuntimeEnvironment,
  abi: any[],
  bytecode: ethers.utils.BytesLike | string,
  signer?: ethers.Signer
) {
  if (signer === undefined) {
    const signers = await hre.ethers.getSigners();
    signer = signers[0];
  }

  const abiWithAddedGas = addGasToAbiMethodsIfNecessary(
    hre.network.config,
    abi
  );

  return new hre.ethers.ContractFactory(abiWithAddedGas, bytecode, signer);
}

export async function getContractAt(
  hre: HardhatRuntimeEnvironment,
  nameOrAbi: string | any[],
  address: string,
  signer?: ethers.Signer
) {
  if (typeof nameOrAbi === "string") {
    const factory = await getContractFactoryByName(hre, nameOrAbi, signer);
    return factory.attach(address);
  }

  if (signer === undefined) {
    const signers = await hre.ethers.getSigners();
    signer = signers[0];
  }

  const abiWithAddedGas = addGasToAbiMethodsIfNecessary(
    hre.network.config,
    nameOrAbi
  );

  return new hre.ethers.Contract(address, abiWithAddedGas, signer);
}

// This helper adds a `gas` field to the ABI function elements if the network
// is set up to use a fixed amount of gas.
// This is done so that ethers doesn't automatically estimate gas limits on
// every call.
function addGasToAbiMethodsIfNecessary(
  networkConfig: NetworkConfig,
  abi: any[]
): any[] {
  if (networkConfig.gas === "auto" || networkConfig.gas === undefined) {
    return abi;
  }

  // ethers adds 21000 to whatever the abi `gas` field has. This may lead to
  // OOG errors, as people may set the default gas to the same value as the
  // block gas limit, especially on Hardhat Network.
  // To avoid this, we substract 21000.
  const gasLimit = ethers.BigNumber.from(networkConfig.gas)
    .sub(21000)
    .toHexString();

  const modifiedAbi: any[] = [];

  for (const abiElement of abi) {
    if (abiElement.type !== "function") {
      modifiedAbi.push(abiElement);
      continue;
    }

    modifiedAbi.push({
      ...abiElement,
      gas: gasLimit,
    });
  }

  return modifiedAbi;
}
