import VM from "@nomiclabs/ethereumjs-vm";
import abi from "ethereumjs-abi";
import Account from "ethereumjs-account";
import { Transaction, TxData } from "ethereumjs-tx";
import { privateToAddress } from "ethereumjs-util";

import { StateManager } from "../../../../src/internal/buidler-evm/provider/types/StateManager";
import { promisify } from "../../../../src/internal/buidler-evm/provider/utils/promisify";
import { MessageTrace } from "../../../../src/internal/buidler-evm/stack-traces/message-trace";
import { VMTracer } from "../../../../src/internal/buidler-evm/stack-traces/vm-tracer";

// These shouldn't be global, but 🤷
let nonce = 0;
const senderPrivateKey = Buffer.from(
  "e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109",
  "hex"
);
const senderAddress = privateToAddress(senderPrivateKey);

export async function instantiateVm(): Promise<VM> {
  // We reset this global here
  nonce = 0;

  const account = new Account({ balance: 1e18 });

  const vm = new VM({ activatePrecompiles: true });

  await promisify(vm.stateManager.putAccount.bind(vm.stateManager))(
    senderAddress,
    account
  );

  return vm;
}

export function encodeConstructorParams(
  contractAbi: any[],
  params: any[]
): Buffer {
  const fAbi = contractAbi.find((a) => a.type === "constructor");

  if (fAbi === undefined || params.length === 0) {
    return Buffer.from([]);
  }

  const types = fAbi.inputs.map((i: any) => i.type);

  return abi.rawEncode(types, params);
}

export function encodeCall(
  contractAbi: any[],
  functionName: string,
  params: any[]
): Buffer {
  const fAbi = contractAbi.find(
    (a) => a.name === functionName && a.inputs.length === params.length
  );

  const types = fAbi.inputs.map((i: any) => i.type);
  const methodId = abi.methodID(functionName, types);

  return Buffer.concat([methodId, abi.rawEncode(types, params)]);
}

export async function traceTransaction(
  vm: VM,
  txData: TxData
): Promise<MessageTrace> {
  const tx = new Transaction({
    value: 0,
    gasLimit: 4000000, // We assume that 4M is enough,
    gasPrice: 1,
    nonce: nonce++,
    ...txData,
  });

  tx.sign(senderPrivateKey);

  const getContractCode = promisify(
    (vm.stateManager as StateManager).getContractCode.bind(vm.stateManager)
  );
  const vmTracer = new VMTracer(vm, getContractCode);
  vmTracer.enableTracing();

  try {
    await vm.runTx({ tx });

    const messageTrace = vmTracer.getLastTopLevelMessageTrace();
    if (messageTrace === undefined) {
      const lastError = vmTracer.getLastError();
      throw lastError ?? new Error("Cannot get last top level message trace");
    }
    return messageTrace;
  } finally {
    vmTracer.disableTracing();
  }
}
