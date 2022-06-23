import { assert } from "chai";
import { ethers } from "ethers";
import sinon from "sinon";
import tmp from "tmp";

import { FileJournal } from "../src/journal/FileJournal";
import { InMemoryJournal } from "../src/journal/InMemoryJournal";
import { Journal } from "../src/journal/types";
import { GasProvider, IgnitionSigner } from "../src/providers";
import { TxSender } from "../src/tx-sender";

class SignerSpy implements IgnitionSigner {
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

function runTests(createJournal: () => Journal) {
  const mockGasProvider = new MockGasProvider();

  it("should add two transactions to journal", async function () {
    const txSender = new TxSender(
      "MyModule",
      "MyExecutor",
      mockGasProvider,
      createJournal()
    );

    const signerStub = createSignerSpy();
    const mockTx1 = createMockTx();
    const [txIndex1, hash1] = await txSender.send(signerStub, mockTx1, 0);
    assert.equal(txIndex1, 0);
    assert.equal(hash1, "hash-0");
    assert.isTrue(signerStub.sendTransaction.calledWith(mockTx1));

    const mockTx2 = createMockTx();
    const [txIndex2, hash2] = await txSender.send(signerStub, mockTx2, 0);
    assert.equal(txIndex2, 1);
    assert.equal(hash2, "hash-1");
    assert.isTrue(signerStub.sendTransaction.calledWith(mockTx2));
  });

  it("should not re-send an already sent transaction", async function () {
    const journal = createJournal();
    const txSender = new TxSender(
      "MyModule",
      "MyExecutor",
      mockGasProvider,
      journal
    );

    const signerStub = createSignerSpy();
    const mockTx1 = createMockTx();
    const [txIndex1, hash1] = await txSender.send(signerStub, mockTx1, 0);
    assert.equal(txIndex1, 0);
    assert.equal(hash1, "hash-0");
    assert.isTrue(signerStub.sendTransaction.calledWith(mockTx1));
    signerStub.sendTransaction.resetHistory();

    const txSender2 = new TxSender(
      "MyModule",
      "MyExecutor",
      mockGasProvider,
      journal
    );
    const [txIndex2, hash2] = await txSender2.send(signerStub, mockTx1, 0);
    assert.equal(txIndex2, 0);
    assert.equal(hash2, "hash-0");
    assert.isFalse(signerStub.sendTransaction.called);
  });
}

describe("TxSender", function () {
  describe("in-memory journal", function () {
    runTests(() => new InMemoryJournal());
  });

  describe("file journal", function () {
    runTests(() => {
      const pathToJournal = tmp.tmpNameSync();
      return new FileJournal(pathToJournal);
    });
  });
});
