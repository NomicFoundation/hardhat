import { Transaction, TxData } from "@ethereumjs/tx";
import VM from "@ethereumjs/vm";
import abi from "ethereumjs-abi";
import { Account, Address, privateToAddress } from "ethereumjs-util";

import { MessageTrace } from "../../../../src/internal/hardhat-network/stack-traces/message-trace";
import { VMTracer } from "../../../../src/internal/hardhat-network/stack-traces/vm-tracer";

const senderPrivateKey = Buffer.from(
  "e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109",
  "hex"
);
const senderAddress = privateToAddress(senderPrivateKey);

export async function instantiateVm(): Promise<VM> {
  const account = Account.fromAccountData({ balance: 1e15 });

  const vm = new VM({ activatePrecompiles: true });

  await vm.stateManager.putAccount(new Address(senderAddress), account);

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
    gasPrice: 1,
    nonce: await getNextPendingNonce(vm),
    ...txData,
    // If the test didn't define a gasLimit, we assume 4M is enough
    gasLimit: txData.gasLimit ?? 4000000,
  });

  const signedTx = tx.sign(senderPrivateKey);

  const getContractCode = vm.stateManager.getContractCode.bind(vm.stateManager);

  const vmTracer = new VMTracer(vm, getContractCode);
  vmTracer.enableTracing();

  try {
    await vm.runTx({ tx: signedTx });

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

async function getNextPendingNonce(vm: VM): Promise<Buffer> {
  const acc = await vm.stateManager.getAccount(new Address(senderAddress));
  return acc.nonce.toBuffer();
}
