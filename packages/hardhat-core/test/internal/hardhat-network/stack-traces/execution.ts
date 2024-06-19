import {
  bigIntToHex,
  bytesToHex,
  privateToAddress,
  toBytes,
} from "@nomicfoundation/ethereumjs-util";

import { MessageTrace } from "../../../../src/internal/hardhat-network/stack-traces/message-trace";
import { defaultHardhatNetworkParams } from "../../../../src/internal/core/config/default-config";
import {
  MempoolOrder,
  TracingConfig,
} from "../../../../src/internal/hardhat-network/provider/node-types";
import { EdrProviderWrapper } from "../../../../src/internal/hardhat-network/provider/provider";
import { VMTracer } from "../../../../src/internal/hardhat-network/stack-traces/vm-tracer";
import { LoggerConfig } from "../../../../src/internal/hardhat-network/provider/modules/logger";

function toBuffer(x: Parameters<typeof toBytes>[0]) {
  return Buffer.from(toBytes(x));
}

const abi = require("ethereumjs-abi");

const senderPrivateKey =
  "0xe331b6d69882b4cb4ea581d88e0b604039a3de5967688d3dcffdd2270c0fd109";

const senderAddress = bytesToHex(privateToAddress(toBuffer(senderPrivateKey)));

export async function instantiateProvider(
  loggerConfig: LoggerConfig,
  tracingConfig: TracingConfig
): Promise<EdrProviderWrapper> {
  const config = {
    hardfork: "shanghai",
    chainId: 1,
    networkId: 1,
    blockGasLimit: 10_000_000,
    minGasPrice: 0n,
    automine: true,
    intervalMining: 0,
    mempoolOrder: "priority" as MempoolOrder,
    chains: defaultHardhatNetworkParams.chains,
    genesisAccounts: [
      {
        privateKey: senderPrivateKey,
        balance: 1e15,
      },
    ],
    allowUnlimitedContractSize: false,
    throwOnTransactionFailures: false,
    throwOnCallFailures: false,
    allowBlocksWithSameTimestamp: false,
    coinbase: "0x0000000000000000000000000000000000000000",
    initialBaseFeePerGas: 0,
    enableTransientStorage: false,
  };

  const provider = await EdrProviderWrapper.create(
    config,
    loggerConfig,
    tracingConfig
  );

  return provider;
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

export interface TxData {
  data: Buffer;
  to?: Buffer;
  value?: bigint;
  gas?: bigint;
}

export async function traceTransaction(
  provider: EdrProviderWrapper,
  txData: TxData
): Promise<MessageTrace> {
  const vmTracer = new VMTracer(false);
  provider.injectVmTracer(vmTracer);

  try {
    await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: senderAddress,
          data: bytesToHex(txData.data),
          to: txData.to !== undefined ? bytesToHex(txData.to) : undefined,
          value: bigIntToHex(txData.value ?? 0n),
          // If the test didn't define a gasLimit, we assume 4M is enough
          gas: bigIntToHex(txData.gas ?? 4000000n),
          gasPrice: bigIntToHex(10n),
        },
      ],
    });

    const trace = vmTracer.getLastTopLevelMessageTrace();
    if (trace === undefined) {
      const error = vmTracer.getLastError();
      throw error ?? new Error("Cannot get last top level message trace");
    }
    return trace;
  } finally {
    provider.injectVmTracer(undefined);
  }
}
