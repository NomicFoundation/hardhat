import { ethers } from "ethers";
import {
  ContractFuture,
  buildRecipe,
  RecipeBuilder,
  InternalFuture,
  Executor,
  Contract,
  Services,
  Hold,
} from "@nomicfoundation/hardhat-ignition";

class TimelockCallExecutor extends Executor<TimelockCallOptions, string> {
  public async execute(
    input: {
      timelock: Contract;
      contract: Contract;
      method: string;
      args: any[];
    },
    services: Services
  ): Promise<string> {
    const Factory = new ethers.Contract(
      input.contract.address,
      input.contract.abi
    );

    const txData = Factory.interface.encodeFunctionData(
      input.method,
      input.args
    );

    const zeroBytes32 = ethers.utils.formatBytes32String("");

    const timelockTxHash = await services.contracts.call(
      input.timelock.address,
      input.timelock.abi,
      "schedule",
      [input.contract.address, 0, txData, zeroBytes32, zeroBytes32, 15]
    );

    const scheduleLog = await services.contracts.getLog(
      timelockTxHash,
      "CallScheduled",
      input.timelock.address,
      input.timelock.abi
    );

    const { id } = scheduleLog.args;

    const isReady = await services.contracts.staticCall(
      input.timelock.address,
      input.timelock.abi,
      "isOperationReady",
      [id]
    );

    if (!isReady) {
      throw new Hold(`Waiting for timelock's tx '${id} to be ready'`);
    }

    const executeTx = await services.contracts.call(
      input.timelock.address,
      input.timelock.abi,
      "execute",
      [input.contract.address, 0, txData, zeroBytes32, zeroBytes32]
    );

    return executeTx;
  }

  public async validate(
    input: TimelockCallOptions,
    services: Services
  ): Promise<string[]> {
    return [];
  }

  public getDescription() {
    return "Deploy contract with timelock";
  }
}

interface TimelockCallOptions {
  timelock: ContractFuture;
  contract: ContractFuture;
  method: string;
}

class TimelockCallFuture extends InternalFuture<TimelockCallOptions, string> {
  public getDependencies(): InternalFuture[] {
    return [this.input.timelock, this.input.contract].filter(
      (x): x is InternalFuture<any, any> => {
        return InternalFuture.isFuture(x);
      }
    );
  }
}

function callFromTimelock(
  m: RecipeBuilder,
  timelock: ContractFuture,
  contract: ContractFuture,
  method: string,
  options: { id: string }
): TimelockCallFuture {
  const id = options.id;
  const b = new TimelockCallFuture(m.getRecipeId(), id, {
    timelock,
    contract,
    method,
  });

  m.addExecutor(new TimelockCallExecutor(b));

  return b;
}

export default buildRecipe("Timelock", (m) => {
  const timelock = m.contract("TimelockController", {
    args: [
      15,
      ["0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"],
      ["0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"],
    ],
  });

  const owned = m.contract("Owned", {
    args: [timelock],
  });

  callFromTimelock(m, timelock, owned, "inc", {
    id: "Owned.inc",
  });

  return { owned };
});
