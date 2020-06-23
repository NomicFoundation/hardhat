import { readArtifact } from "@nomiclabs/buidler/plugins";
import {
  BuidlerRuntimeEnvironment,
  NetworkConfig,
} from "@nomiclabs/buidler/types";
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
  bytecode: ethers.utils.BytesLike | string,
  signer?: ethers.Signer
): Promise<ethers.ContractFactory>;

export async function getContractFactory(
  bre: BuidlerRuntimeEnvironment,
  nameOrAbi: string | any[],
  bytecodeOrSigner?: ethers.Signer | ethers.utils.BytesLike | string,
  signer?: ethers.Signer
) {
  if (typeof nameOrAbi === "string") {
    return getContractFactoryByName(
      bre,
      nameOrAbi,
      bytecodeOrSigner as ethers.Signer | undefined
    );
  }

  return getContractFactoryByAbiAndBytecode(
    bre,
    nameOrAbi,
    bytecodeOrSigner as ethers.utils.BytesLike | string,
    signer
  );
}

export async function getContractFactoryByName(
  bre: BuidlerRuntimeEnvironment,
  name: string,
  signer?: ethers.Signer
) {
  const artifact = await readArtifact(bre.config.paths.artifacts, name);
  return getContractFactoryByAbiAndBytecode(
    bre,
    artifact.abi,
    artifact.bytecode,
    signer
  );
}

export async function getContractFactoryByAbiAndBytecode(
  bre: BuidlerRuntimeEnvironment,
  abi: any[],
  bytecode: ethers.utils.BytesLike | string,
  signer?: ethers.Signer
) {
  if (signer === undefined) {
    const signers = await bre.ethers.getSigners();
    signer = signers[0];
  }

  const abiWithAddedGas = addGasToAbiMethodsIfNecessary(
    bre.network.config,
    abi
  );

  return new bre.ethers.ContractFactory(abiWithAddedGas, bytecode, signer);
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
    const signers = await bre.ethers.getSigners();
    signer = signers[0];
  }

  const abiWithAddedGas = addGasToAbiMethodsIfNecessary(
    bre.network.config,
    nameOrAbi
  );

  return new bre.ethers.Contract(address, abiWithAddedGas, signer);
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
  // block gas limit, especially on Buidler EVM.
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
