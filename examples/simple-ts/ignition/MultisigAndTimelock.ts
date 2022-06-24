import { ethers } from "ethers";
import {
  ContractBinding,
  buildModule,
  ModuleBuilder,
  InternalBinding,
  Executor,
  Services,
  Binding,
  Hold,
} from "@nomiclabs/hardhat-ignition";

interface CallFromMultisigAndTimelockOptions {
  id: string;
  args?: any[];
}

interface MultiSigContractOptions {
  multisig: ContractBinding;
  timelock: ContractBinding;
  destination: ContractBinding;
  method: string;
  args: unknown[];
}

class MultisigAndTimelockExecutor extends Executor<
  MultiSigContractOptions,
  string
> {
  public async execute(
    input: {
      multisig: { abi: any[]; address: string };
      timelock: { abi: any[]; address: string };
      destination: { abi: any[]; address: string };
      method: string;
      args: unknown[];
    },
    services: Services
  ): Promise<string> {
    const zeroBytes32 = ethers.utils.formatBytes32String("");

    // contracts instances
    const contractToCall = new ethers.Contract(
      input.destination.address,
      input.destination.abi
    );
    const timelock = new ethers.Contract(
      input.timelock.address,
      input.timelock.abi
    );

    // function to call to timelocked contract
    const txData = contractToCall.interface.encodeFunctionData(
      input.method,
      input.args
    );

    const timelockParameters = [
      input.destination.address,
      0,
      txData,
      zeroBytes32,
      zeroBytes32,
    ];

    // send timelocked tx to multisig
    const scheduleTxData = timelock.interface.encodeFunctionData("schedule", [
      ...timelockParameters,
      15,
    ]);

    console.log("[MultisigAndTimelockExecutor] submit schedule tx");
    const multisigScheduleTx = await services.contracts.call(
      input.multisig.address,
      input.multisig.abi,
      "submitTransaction",
      [input.timelock.address, 0, scheduleTxData],
      { gasLimit: 5000000 }
    );

    const multisigScheduleSubmissionLog = await services.contracts.getLog(
      multisigScheduleTx,
      "Submission",
      input.multisig.address,
      input.multisig.abi
    );

    const { transactionId: multisigScheduleTxId } =
      multisigScheduleSubmissionLog.args;

    // wait until the multisig schedule is confirmed
    const isScheduleConfirmed = await services.contracts.staticCall(
      input.multisig.address,
      input.multisig.abi,
      "isConfirmed",
      [multisigScheduleTxId]
    );

    if (!isScheduleConfirmed) {
      throw new Hold(
        `Waiting for multisig to confirm the schedule, tx id is '${multisigScheduleTxId}'`
      );
    }

    // wait until the wait time passes
    const timelockCallId = await services.contracts.staticCall(
      input.timelock.address,
      input.timelock.abi,
      "hashOperation",
      timelockParameters
    );

    const isReady = await services.contracts.staticCall(
      input.timelock.address,
      input.timelock.abi,
      "isOperationReady",
      [timelockCallId]
    );
    const isDone = await services.contracts.staticCall(
      input.timelock.address,
      input.timelock.abi,
      "isOperationDone",
      [timelockCallId]
    );

    if (!isReady && !isDone) {
      throw new Hold(
        `Waiting for timelock's tx '${timelockCallId} to be ready'`
      );
    }

    // execute the timelocked tx through the multisig
    const executeTxData = timelock.interface.encodeFunctionData(
      "execute",
      timelockParameters
    );

    console.log("[MultisigAndTimelockExecutor] submit execute tx");
    const multisigExecuteTx = await services.contracts.call(
      input.multisig.address,
      input.multisig.abi,
      "submitTransaction",
      [input.timelock.address, 0, executeTxData],
      { gasLimit: 5000000 }
    );

    const multisigExecuteSubmissionLog = await services.contracts.getLog(
      multisigExecuteTx,
      "Submission",
      input.multisig.address,
      input.multisig.abi
    );

    const { transactionId: multisigExecuteTxId } =
      multisigExecuteSubmissionLog.args;

    // wait until the multisig execute is confirmed
    const isConfirmed = await services.contracts.staticCall(
      input.multisig.address,
      input.multisig.abi,
      "isConfirmed",
      [multisigExecuteTxId]
    );

    if (!isConfirmed) {
      throw new Hold(
        `Waiting for multisig to confirm the execution of ${multisigExecuteTxId}`
      );
    }

    return "done";
  }

  public async validate(input: {}, services: Services): Promise<string[]> {
    return [];
  }

  public getDescription() {
    return "Deploy contract with multisig and timelock";
  }
}

class MultisigAndTimelockBinding extends InternalBinding<
  MultiSigContractOptions,
  string
> {
  public getDependencies(): InternalBinding[] {
    return [
      this.input.multisig,
      this.input.timelock,
      this.input.destination,
      ...this.input.args,
    ].filter((x): x is InternalBinding<unknown, any> => {
      return InternalBinding.isBinding(x);
    });
  }
}

function callFromMultisigAndTimelock(
  m: ModuleBuilder,
  multisig: ContractBinding,
  timelock: ContractBinding,
  destination: ContractBinding,
  method: string,
  options: CallFromMultisigAndTimelockOptions
): Binding<any, string> {
  const id = options.id;
  const args = options?.args ?? [];
  const b = new MultisigAndTimelockBinding(m.getModuleId(), id, {
    multisig,
    timelock,
    destination,
    method,
    args,
  });

  m.addExecutor(new MultisigAndTimelockExecutor(b));

  return b;
}

export default buildModule("MultisigAndTimelock", (m) => {
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

  const timelock = m.contract("TimelockController", {
    args: [15, [multisig], [multisig]],
  });

  const owned = m.contract("Owned", {
    args: [timelock],
  });

  callFromMultisigAndTimelock(m, multisig, timelock, owned, "inc", {
    id: "Owned.inc",
  });

  return { owned };
});
