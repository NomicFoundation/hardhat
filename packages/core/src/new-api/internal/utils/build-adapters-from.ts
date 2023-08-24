import {
  BrowserProvider,
  Signer,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
} from "ethers";

import { IgnitionError } from "../../../errors";
import { EIP1193Provider } from "../../types/provider";
import {
  Adapters,
  BlocksAdapter,
  GasAdapter,
  SignerAdapter,
  TransactionsAdapter,
} from "../types/adapters";

export function buildAdaptersFrom(provider: EIP1193Provider): Adapters {
  const ethersProvider = new BrowserProvider(provider);

  const signerAdapter: SignerAdapter = {
    getSigner: async (address: string): Promise<Signer> =>
      ethersProvider.getSigner(address),
  };

  const gasAdapter: GasAdapter = {
    estimateGasLimit: async (tx: TransactionRequest): Promise<bigint> => {
      const gasLimit = await ethersProvider.estimateGas(tx);

      // return 1.5x estimated gas
      return (gasLimit * 15n) / 10n;
    },
    estimateGasPrice: async (): Promise<bigint> => {
      return BigInt("0.000000001"); // 1 gwei
    },
  };

  const transactionsAdapter: TransactionsAdapter = {
    async getTransactionReceipt(
      txHash: string
    ): Promise<TransactionReceipt | null | undefined> {
      return ethersProvider.getTransactionReceipt(txHash);
    },
    async getTransaction(
      txHash: string
    ): Promise<TransactionResponse | null | undefined> {
      return ethersProvider.getTransaction(txHash);
    },
    async getPendingTransactionCount(address: string): Promise<number> {
      const countResponse = (await provider.request({
        method: "eth_getTransactionCount",
        params: [address, "pending"],
      })) as string;

      return parseInt(countResponse, 10);
    },
    async getLatestTransactionCount(address: string): Promise<number> {
      const countResponse = (await provider.request({
        method: "eth_getTransactionCount",
        params: [address, "latest"],
      })) as string;

      return parseInt(countResponse, 10);
    },
  };

  const blockAdapter: BlocksAdapter = {
    async getBlock(): Promise<{ number: number; hash: string }> {
      const blockNumber = await ethersProvider.getBlockNumber();

      const block = await ethersProvider.getBlock(blockNumber);

      if (block === null) {
        throw new IgnitionError(`Unable to fetch block #${blockNumber}`);
      }

      return { number: block.number, hash: block.hash ?? "" };
    },
  };

  const adapters: Adapters = {
    transactions: transactionsAdapter,
    gas: gasAdapter,
    signer: signerAdapter,
    blocks: blockAdapter,
  };

  return adapters;
}
