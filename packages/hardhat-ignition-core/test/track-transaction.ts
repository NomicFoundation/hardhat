import { assert } from "chai";
import path from "path";

import { EIP1193Provider, RequestArguments, trackTransaction } from "../src";
import { NetworkTransaction } from "../src/internal/execution/types/jsonrpc";
import { JournalMessageType } from "../src/internal/execution/types/messages";

const mockFullTx = {
  hash: "0x1a3eb512e21fc849f8e8733b250ce49b61178c9c4a670063f969db59eda4a59f",
  input:
    "0x60806040526040516105d83803806105d8833981810160405281019061002591906100f0565b804210610067576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161005e906101a0565b60405180910390fd5b8060008190555033600160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550506101c0565b600080fd5b6000819050919050565b6100cd816100ba565b81146100d857600080fd5b50565b6000815190506100ea816100c4565b92915050565b600060208284031215610106576101056100b5565b5b6000610114848285016100db565b91505092915050565b600082825260208201905092915050565b7f556e6c6f636b2074696d652073686f756c6420626520696e207468652066757460008201527f7572650000000000000000000000000000000000000000000000000000000000602082015250565b600061018a60238361011d565b91506101958261012e565b604082019050919050565b600060208201905081810360008301526101b98161017d565b9050919050565b610409806101cf6000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063251c1aa3146100465780633ccfd60b146100645780638da5cb5b1461006e575b600080fd5b61004e61008c565b60405161005b919061024a565b60405180910390f35b61006c610092565b005b61007661020b565b60405161008391906102a6565b60405180910390f35b60005481565b6000544210156100d7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016100ce9061031e565b60405180910390fd5b600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610167576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161015e9061038a565b60405180910390fd5b7fbf2ed60bd5b5965d685680c01195c9514e4382e28e3a5a2d2d5244bf59411b9347426040516101989291906103aa565b60405180910390a1600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc479081150290604051600060405180830381858888f19350505050158015610208573d6000803e3d6000fd5b50565b600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6000819050919050565b61024481610231565b82525050565b600060208201905061025f600083018461023b565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061029082610265565b9050919050565b6102a081610285565b82525050565b60006020820190506102bb6000830184610297565b92915050565b600082825260208201905092915050565b7f596f752063616e27742077697468647261772079657400000000000000000000600082015250565b60006103086016836102c1565b9150610313826102d2565b602082019050919050565b60006020820190508181036000830152610337816102fb565b9050919050565b7f596f75206172656e277420746865206f776e6572000000000000000000000000600082015250565b60006103746014836102c1565b915061037f8261033e565b602082019050919050565b600060208201905081810360008301526103a381610367565b9050919050565b60006040820190506103bf600083018561023b565b6103cc602083018461023b565b939250505056fea2646970667358221220f92f73d2a3284a3c1cca55a0fe6ec1a91b13bec884aecdbcf644cebf2774f32f64736f6c6343000813003300000000000000000000000000000000000000000000000000000000767d1650",
  from: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  to: null,
  chainId: "0x7A69",
  value: "1000000000",
  nonce: "0x1",
  blockHash:
    "0xc03bdad45bf3997457e33261cfc85e2ee45380706685468006c5b37e273a52f0",
  blockNumber: "0x2",
  maxFeePerGas: "0xA3E9AB80",
  maxPriorityFeePerGas: "0x3B9ACA00",
  gas: "0x4F9E0",
};

class MockEIP1193Provider implements EIP1193Provider {
  constructor(
    public fullTx: NetworkTransaction | null = null,
    public confirmations: number = 6
  ) {}

  public async request(args: RequestArguments): Promise<any> {
    if (args.method === "eth_getTransactionByHash") {
      return this.fullTx;
    }

    if (args.method === "eth_getBlockByNumber") {
      return {
        number: `0x${this.confirmations.toString(16)}`,
        hash: "0x1234",
      };
    }

    if (args.method === "eth_getTransactionReceipt") {
      return {
        blockNumber: "0x1",
        blockHash: "0x1234",
        status: "0x1",
        contractAddress: null,
        logs: [],
      };
    }

    throw new Error("Method not implemented");
  }
}

describe("trackTransaction", () => {
  it("(with TX_SEND in journal) should apply an ONCHAIN_INTERACTION_REPLACED_BY_USER message to the journal if the user replaced our transaction and their transaction has enough confirmations", async () => {
    const deploymentDir = path.resolve(
      __dirname,
      "./mocks/trackTransaction/known-tx"
    );

    const hash = "0x1234";

    let message: any;

    async function applyMessageFn(
      msg: any,
      deploymentState: any,
      _deploymentLoader: any
    ) {
      message = msg;
      return deploymentState;
    }

    const result = await trackTransaction(
      deploymentDir,
      hash,
      new MockEIP1193Provider({ ...mockFullTx, hash }, 8),
      undefined,
      applyMessageFn
    );

    assert.deepEqual(message, {
      type: JournalMessageType.ONCHAIN_INTERACTION_REPLACED_BY_USER,
      futureId: "LockModule#Lock",
      networkInteractionId: 1,
    });
    assert.equal(
      result,
      `Your deployment has been fixed and will continue with the execution of the "LockModule#Lock" future.

If this is not the expected behavior, please edit your Hardhat Ignition module accordingly before re-running your deployment.`
    );
  });

  it("(without TX_SEND in journal) should apply an ONCHAIN_INTERACTION_REPLACED_BY_USER message to the journal if the user replaced our transaction and their transaction has enough confirmations", async () => {
    const deploymentDir = path.resolve(
      __dirname,
      "./mocks/trackTransaction/success"
    );

    let message: any;

    async function applyMessageFn(
      msg: any,
      deploymentState: any,
      _deploymentLoader: any
    ) {
      message = msg;
      return deploymentState;
    }

    const result = await trackTransaction(
      deploymentDir,
      mockFullTx.hash,
      new MockEIP1193Provider({ ...mockFullTx, value: "0x1111" }, 8),
      undefined,
      applyMessageFn
    );

    assert.deepEqual(message, {
      type: JournalMessageType.ONCHAIN_INTERACTION_REPLACED_BY_USER,
      futureId: "LockModule#Lock",
      networkInteractionId: 1,
    });
    assert.equal(
      result,
      `Your deployment has been fixed and will continue with the execution of the "LockModule#Lock" future.

If this is not the expected behavior, please edit your Hardhat Ignition module accordingly before re-running your deployment.`
    );
  });

  it("should apply a TRANSACTION_SEND message to the journal if the user's txHash matches our prepareSendMessage perfectly", async () => {
    const deploymentDir = path.resolve(
      __dirname,
      "./mocks/trackTransaction/success"
    );

    let message: any;

    async function applyMessageFn(
      msg: any,
      deploymentState: any,
      _deploymentLoader: any
    ) {
      message = msg;
      return deploymentState;
    }

    await trackTransaction(
      deploymentDir,
      mockFullTx.hash,
      new MockEIP1193Provider(mockFullTx),
      undefined,
      applyMessageFn
    );

    assert.deepEqual(message, {
      type: JournalMessageType.TRANSACTION_SEND,
      futureId: "LockModule#Lock",
      networkInteractionId: 1,
      nonce: 1,
      transaction: {
        hash: "0x1a3eb512e21fc849f8e8733b250ce49b61178c9c4a670063f969db59eda4a59f",
        fees: { maxFeePerGas: 2750000000n, maxPriorityFeePerGas: 1000000000n },
      },
    });
  });

  describe("errors", () => {
    it("should throw an error if the deploymentDir does not exist", async () => {
      await assert.isRejected(
        trackTransaction(
          "non-existent-dir",
          "txHash",
          new MockEIP1193Provider()
        ),
        "Deployment directory non-existent-dir not found"
      );
    });

    it("should throw an error if the deploymentDir leads to an uninitialized deployment", async () => {
      const deploymentDir = path.resolve(
        __dirname,
        "./mocks/trackTransaction/uninitialized"
      );

      await assert.isRejected(
        trackTransaction(deploymentDir, "txHash", new MockEIP1193Provider()),
        `Cannot track transaction for nonexistant deployment at ${deploymentDir}`
      );
    });

    it("should throw an error if the transaction cannot be retrived from the provider", async () => {
      const deploymentDir = path.resolve(
        __dirname,
        "./mocks/trackTransaction/success"
      );

      await assert.isRejected(
        trackTransaction(deploymentDir, "txHash", new MockEIP1193Provider()),
        `Transaction txHash not found. Please double check the transaction hash and try again.`
      );
    });

    it("should throw an error if the user tries to track a transaction we already know about", async () => {
      const deploymentDir = path.resolve(
        __dirname,
        "./mocks/trackTransaction/known-tx"
      );

      await assert.isRejected(
        trackTransaction(
          deploymentDir,
          mockFullTx.hash,
          new MockEIP1193Provider(mockFullTx)
        ),
        `The transaction hash that you provided was already present in your deployment. 

Please double check the error you are getting when running Hardhat Ignition, and the instructions it's providing.`
      );
    });

    it("(with TX_SEND in journal) should throw an error if the user replaced our transaction and their transaction does not have enough confirmations yet", async () => {
      const deploymentDir = path.resolve(
        __dirname,
        "./mocks/trackTransaction/known-tx"
      );

      const hash = "0x1234";

      await assert.isRejected(
        trackTransaction(
          deploymentDir,
          hash,
          new MockEIP1193Provider({ ...mockFullTx, hash }, 2)
        ),
        `The transaction you provided doesn't have enough confirmations yet. 

Please try again later.`
      );
    });

    it("should throw an error if we were unable to find a prepareSendMessage that matches the nonce of the given txHash", async () => {
      const deploymentDir = path.resolve(
        __dirname,
        "./mocks/trackTransaction/success"
      );

      await assert.isRejected(
        trackTransaction(
          deploymentDir,
          mockFullTx.hash,
          new MockEIP1193Provider({ ...mockFullTx, nonce: "0x4" })
        ),
        `The transaction you provided doesn't seem to belong to your deployment.

Please double check the error you are getting when running Hardhat Ignition, and the instructions it's providing.`
      );
    });

    it("(without TX_SEND in journal) should throw an error if the user replaced our transaction and their transaction does not have enough confirmations yet", async () => {
      const deploymentDir = path.resolve(
        __dirname,
        "./mocks/trackTransaction/success"
      );

      await assert.isRejected(
        trackTransaction(
          deploymentDir,
          mockFullTx.hash,
          new MockEIP1193Provider({ ...mockFullTx, value: "0x11" }, 2)
        ),
        `The transaction you provided doesn't have enough confirmations yet. 

Please try again later.`
      );
    });
  });
});
