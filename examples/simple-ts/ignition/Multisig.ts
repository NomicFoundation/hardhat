import { ethers } from "ethers";
import {
  AddressLike,
  ContractBinding,
  ContractOptions,
  buildModule,
  ModuleBuilder,
  InternalBinding,
  Executor,
  Services,
  Binding,
  Hold,
} from "@nomiclabs/hardhat-ignition";

interface CallFromMultisigOptions {
  id: string;
  args?: any[];
}

interface MultiSigContractOptions {
  multiSigWalletAddress: AddressLike;
  contractName: string;
  destination: AddressLike;
  method: string;
  args: unknown[];
}

class MultisigContractExecutor extends Executor<
  MultiSigContractOptions,
  string
> {
  public async execute(
    input: {
      multiSigWalletAddress: string | { address: string };
      contractName: string;
      destination: string | { address: string };
      method: string;
      args: unknown[];
    },
    services: Services
  ): Promise<string> {
    const multiSigWalletArtifact = await services.artifacts.getArtifact(
      "MultiSigWallet"
    );
    const multiSigWalletAddress =
      typeof input.multiSigWalletAddress === "string"
        ? input.multiSigWalletAddress
        : input.multiSigWalletAddress.address;
    const destinationAddress =
      typeof input.destination === "string"
        ? input.destination
        : input.destination.address;

    const contractArtifact = await services.artifacts.getArtifact(
      input.contractName
    );
    const Factory = new ethers.Contract(
      destinationAddress,
      contractArtifact.abi
    );

    const txData = Factory.interface.encodeFunctionData(
      input.method,
      input.args
    );

    const multisigTx = await services.contracts.call(
      multiSigWalletAddress,
      multiSigWalletArtifact.abi,
      "submitTransaction",
      [destinationAddress, 0, txData]
    );

    const submissionLog = await services.contracts.getLog(
      multisigTx,
      "Submission",
      multiSigWalletAddress,
      multiSigWalletArtifact.abi
    );

    const { transactionId } = submissionLog.args;

    const isConfirmed = await services.contracts.staticCall(
      multiSigWalletAddress,
      multiSigWalletArtifact.abi,
      "isConfirmed",
      [transactionId]
    );

    if (!isConfirmed) {
      throw new Hold(`Waiting for multisig to confirm ${transactionId}`);
    }

    return multisigTx;
  }

  public async validate(input: {}, services: Services): Promise<string[]> {
    return [];
  }

  public getDescription() {
    return "Deploy contract with multisig and timelock";
  }
}

class MultisigContractBinding extends InternalBinding<
  MultiSigContractOptions,
  string
> {
  public getDependencies(): InternalBinding[] {
    return [
      this.input.multiSigWalletAddress,
      this.input.destination,
      ...this.input.args,
    ].filter((x): x is InternalBinding<any, any> => {
      return InternalBinding.isBinding(x);
    });
  }
}

function callFromMultisig(
  m: ModuleBuilder,
  multisig: AddressLike,
  contractName: string,
  destination: AddressLike,
  method: string,
  options: CallFromMultisigOptions
): Binding<any, string> {
  const id = options.id;
  const args = options?.args ?? [];
  const b = new MultisigContractBinding(m.getModuleId(), id, {
    multiSigWalletAddress: multisig,
    contractName,
    destination,
    method,
    args,
  });

  m.addExecutor(new MultisigContractExecutor(b));

  return b;
}

export default buildModule("Multisig", (m) => {
  const multisig = m.contract("MultiSigWallet", {
    args: [
      [
        "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
        "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
      ],
      2,
    ],
  });

  const owned = m.contract("Owned", {
    args: [multisig],
  });

  const tx = callFromMultisig(m, multisig, "Owned", owned, "inc", {
    id: "Owned.inc",
  });

  return { multisig, tx, owned };
});
