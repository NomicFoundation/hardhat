import { Block } from "@nomicfoundation/ethereumjs-block";
import { Common } from "@nomicfoundation/ethereumjs-common";
import { Transaction, TxData } from "@nomicfoundation/ethereumjs-tx";
import {
  Account,
  Address,
  privateToAddress,
  bigIntToBuffer,
} from "@nomicfoundation/ethereumjs-util";
import abi from "ethereumjs-abi";
import { HardhatBlockchain } from "../../../../src/internal/hardhat-network/provider/HardhatBlockchain";

import { VMAdapter } from "../../../../src/internal/hardhat-network/provider/vm/vm-adapter";
import { DualModeAdapter } from "../../../../src/internal/hardhat-network/provider/vm/dual";
import { MessageTrace } from "../../../../src/internal/hardhat-network/stack-traces/message-trace";
import { VMTracer } from "../../../../src/internal/hardhat-network/stack-traces/vm-tracer";
import { defaultHardhatNetworkParams } from "../../../../src/internal/core/config/default-config";
import { BlockBuilder } from "../../../../src/internal/hardhat-network/provider/vm/block-builder";

const senderPrivateKey = Buffer.from(
  "e331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109",
  "hex"
);
const senderAddress = privateToAddress(senderPrivateKey);

export async function instantiateVm(): Promise<[VMAdapter, Common]> {
  const account = Account.fromAccountData({ balance: 1e15 });

  const common = new Common({ chain: "mainnet" });
  const blockchain = new HardhatBlockchain(common);
  await blockchain.addBlock(
    Block.fromBlockData({
      header: {
        number: 0n,
      },
    })
  );

  const vm = await DualModeAdapter.create(
    common,
    blockchain,
    {
      automine: true,
      blockGasLimit: 1_000_000,
      chainId: 1,
      genesisAccounts: [],
      hardfork: "london",
      minGasPrice: 0n,
      networkId: 1,
      networkName: "mainnet",
      mempoolOrder: "priority",
      coinbase: "0x0000000000000000000000000000000000000000",
      chains: defaultHardhatNetworkParams.chains,
    },
    () => "london"
  );

  await vm.putAccount(new Address(senderAddress), account);

  return [vm, common];
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
  vm: VMAdapter,
  common: Common,
  txData: TxData
): Promise<MessageTrace> {
  const tx = new Transaction({
    value: 0,
    gasPrice: 10,
    nonce: await getNextPendingNonce(vm),
    ...txData,
    // If the test didn't define a gasLimit, we assume 4M is enough
    gasLimit: txData.gasLimit ?? 4000000,
  });

  const signedTx = tx.sign(senderPrivateKey);

  const vmTracer = new VMTracer(vm as any, common);
  vmTracer.enableTracing();

  try {
    const blockBuilder = new BlockBuilder(vm, common, {
      parentBlock: Block.fromBlockData(
        {},
        {
          skipConsensusFormatValidation: true,
        }
      ),
      headerData: {
        gasLimit: 10_000_000n,
      },
    });
    await blockBuilder.startBlock();
    await blockBuilder.addTransaction(signedTx);
    await blockBuilder.addRewards([]);
    await blockBuilder.seal();

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

async function getNextPendingNonce(vm: VMAdapter): Promise<Buffer> {
  const acc = await vm.getAccount(new Address(senderAddress));
  return bigIntToBuffer(acc.nonce);
}
