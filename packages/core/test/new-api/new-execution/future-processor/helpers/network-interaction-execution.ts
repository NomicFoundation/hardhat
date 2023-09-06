import { assert } from "chai";

import { runStaticCall } from "../../../../../src/internal/new-execution/future-processor/helpers/network-interaction-execution";
import {
  JsonRpcClient,
  CallParams,
  EstimateGasParams,
  TransactionParams,
  Block,
} from "../../../../../src/internal/new-execution/jsonrpc-client";
import {
  NetworkFees,
  RawStaticCallResult,
  Transaction,
  TransactionReceipt,
} from "../../../../../src/internal/new-execution/types/jsonrpc";
import {
  NetworkInteractionType,
  StaticCall,
} from "../../../../../src/internal/new-execution/types/network-interaction";

class StubJsonRpcClient implements JsonRpcClient {
  public async getChainId(): Promise<number> {
    throw new Error("Mock not implemented.");
  }

  public async getNetworkFees(): Promise<NetworkFees> {
    throw new Error("Mock not implemented.");
  }

  public async getLatestBlock(): Promise<Block> {
    throw new Error("Mock not implemented.");
  }
  public async getBalance(
    _address: string,
    _blockTag: "latest" | "pending"
  ): Promise<bigint> {
    throw new Error("Mock not implemented.");
  }

  public async call(
    _callParams: CallParams,
    _blockTag: "latest" | "pending"
  ): Promise<RawStaticCallResult> {
    throw new Error("Mock not implemented.");
  }

  public async estimateGas(
    _transactionParams: EstimateGasParams
  ): Promise<bigint> {
    throw new Error("Mock not implemented.");
  }

  public async sendTransaction(
    _transactionParams: TransactionParams
  ): Promise<string> {
    throw new Error("Mock not implemented.");
  }

  public async getTransactionCount(
    _address: string,
    _blockTag: number | "latest" | "pending"
  ): Promise<number> {
    throw new Error("Mock not implemented.");
  }

  public async getTransaction(
    _txHash: string
  ): Promise<Omit<Transaction, "receipt"> | undefined> {
    throw new Error("Mock not implemented.");
  }

  public async getTransactionReceipt(
    _txHash: string
  ): Promise<TransactionReceipt | undefined> {
    throw new Error("Mock not implemented.");
  }
}

describe("Network interactions", () => {
  describe("runStaticCall", () => {
    it("Should run the static call as latest and return the result", async () => {
      const staticCall: StaticCall = {
        from: "0x123",
        to: "0x456",
        data: "0x789",
        value: 8n,
        id: 1,
        type: NetworkInteractionType.STATIC_CALL,
      };

      const expectedResult: RawStaticCallResult = {
        customErrorReported: true,
        returnData: "0x1234",
        success: false,
      };

      class MockJsonRpcClient extends StubJsonRpcClient {
        public calls: number = 0;

        public async call(
          callParams: CallParams,
          blockTag: "latest" | "pending"
        ): Promise<RawStaticCallResult> {
          this.calls += 1;
          assert.equal(callParams.from, staticCall.from);
          assert.equal(callParams.to, staticCall.to);
          assert.equal(callParams.data, staticCall.data);
          assert.equal(callParams.value, staticCall.value);
          assert.isUndefined(callParams.fees);
          assert.isUndefined(callParams.nonce);
          assert.equal(blockTag, "latest");

          return expectedResult;
        }
      }

      const mockClient = new MockJsonRpcClient();
      const result = await runStaticCall(mockClient, staticCall);
      assert.equal(result, expectedResult);
      assert.equal(mockClient.calls, 1);
    });
  });

  describe("sendTransactionForOnchainInteraction", () => {
    describe("First transaction", () => {
      it("Should allocate a nonce for the onchain interaction's sender", async () => {
        // TODO @alcuadrado
      });

      it("Should use the recommended network fees", async () => {
        // TODO @alcuadrado
      });

      describe("When the gas estimation succeeds", () => {
        describe("When the simulation fails", () => {
          it("Should return the decoded simulation error", async () => {
            // TODO @alcuadrado
          });
        });

        describe("When the simulation succeeds", () => {
          it("Should send the transaction and return its hash and nonce", async () => {
            // TODO @alcuadrado
          });
        });
      });

      describe("When the gas estimation fails", () => {
        describe("When the simulation fails", () => {
          it("Should return the decoded simulation error", async () => {
            // TODO @alcuadrado
          });
        });

        describe("When the simulation succeeds", () => {
          it("Should hit an invariant violation", async () => {
            // TODO @alcuadrado
          });
        });
      });
    });

    describe("Follow up transaction", () => {
      it("Should reuse the nonce that the onchain interaction has, and not allocate a new one", async () => {
        // TODO @alcuadrado
      });

      it("Should bump fees and also take recommended network fees into account", async () => {
        // TODO @alcuadrado
      });

      it("Should re-estimate the gas limit", async () => {
        // TODO @alcuadrado
      });

      it("Should run a new simulation", async () => {
        // TODO @alcuadrado
      });
    });
  });
});
