/* eslint-disable import/no-unused-modules */
import { assert } from "chai";
import { ethers } from "ethers";
import sinon from "sinon";

import { GasProvider } from "../src/types/providers";
import { TxSender } from "../src/utils/tx-sender";

class SignerSpy {
  private _index = -1;

  public async sendTransaction(_tx: ethers.providers.TransactionRequest) {
    this._index++;
    return {
      hash: `hash-${this._index}`,
    } as ethers.providers.TransactionResponse;
  }
}

class MockGasProvider implements GasProvider {
  public async estimateGasLimit(
    _tx: ethers.providers.TransactionRequest
  ): Promise<ethers.BigNumber> {
    return ethers.BigNumber.from(21000);
  }
  public async estimateGasPrice(): Promise<ethers.BigNumber> {
    return ethers.utils.parseUnits("1", "gwei");
  }
}

function createSignerSpy() {
  const signerSpy = new SignerSpy();

  return sinon.spy(signerSpy);
}

function createMockTx() {
  return {} as ethers.providers.TransactionRequest;
}

function runTests() {
  const mockGasProvider = new MockGasProvider();

  it("should add two transactions to journal", async function () {
    const txSender = new TxSender(mockGasProvider);

    const signerStub = createSignerSpy();
    const mockTx1 = createMockTx();
    const hash1 = await txSender.send(signerStub as any, mockTx1);
    assert.equal(hash1, "hash-0");
    assert.isTrue(signerStub.sendTransaction.calledWith(mockTx1));

    const mockTx2 = createMockTx();
    const hash2 = await txSender.send(signerStub as any, mockTx2);
    assert.equal(hash2, "hash-1");
    assert.isTrue(signerStub.sendTransaction.calledWith(mockTx2));
  });
}

describe("TxSender", function () {
  runTests();
});
