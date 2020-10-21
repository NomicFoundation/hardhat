import { assert } from "chai";
import { Transaction } from "ethereumjs-tx";
import { bufferToHex, toBuffer } from "ethereumjs-util";

import { randomAddressBuffer } from "../../../../src/internal/hardhat-network/provider/fork/random";
import { OrderedTransaction } from "../../../../src/internal/hardhat-network/provider/PoolState";

import { createTestOrderedTransaction } from "./blockchain";
import { DEFAULT_ACCOUNTS } from "./providers";

export function assertEqualTransactionMaps(
  actual: Map<string, OrderedTransaction[]>,
  expected: Map<string, OrderedTransaction[]>
) {
  assert.equal(actual.size, expected.size, "Map sizes do not match");
  actual.forEach((actualList, key) => {
    const expectedList = expected.get(key);
    assert.exists(expectedList, `Expected map doesn't have ${key} value`);
    assertEqualTransactionLists(actualList, expectedList!);
  });
}

export function assertEqualTransactionLists(
  actual: OrderedTransaction[],
  expected: OrderedTransaction[]
) {
  assert.deepEqual(
    actual.map((tx) => tx.data.raw),
    expected.map((tx) => tx.data.raw)
  );
}

describe("assertEqualTransactionMaps", () => {
  it("does not throw if maps are equal", async () => {
    const tx1 = createTestOrderedTransaction({ orderId: 0 });
    const tx2 = createTestOrderedTransaction({ orderId: 1 });

    const tx1Copy: OrderedTransaction = {
      orderId: 0,
      data: new Transaction(tx1.data.raw),
    };
    const tx2Copy: OrderedTransaction = {
      orderId: 1,
      data: new Transaction(tx2.data.raw),
    };

    tx1.data.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
    tx2.data.sign(toBuffer(DEFAULT_ACCOUNTS[1].privateKey));

    tx1Copy.data.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
    tx2Copy.data.sign(toBuffer(DEFAULT_ACCOUNTS[1].privateKey));

    const actualMap: Map<string, OrderedTransaction[]> = new Map();
    actualMap.set(bufferToHex(tx1.data.getSenderAddress()), [tx1]);
    actualMap.set(bufferToHex(tx2.data.getSenderAddress()), [tx2]);

    const expectedMap = new Map(actualMap);
    expectedMap.set(bufferToHex(tx1.data.getSenderAddress()), [tx1Copy]);
    expectedMap.set(bufferToHex(tx2.data.getSenderAddress()), [tx2Copy]);

    assert.doesNotThrow(() => {
      assertEqualTransactionMaps(actualMap, expectedMap);
    });
  });

  it("throws if maps don't have the same size", () => {
    // Actual:
    // A -> [1, 2]
    // Expected:
    // A -> [1, 2]
    // B -> [1]

    const tx1 = createTestOrderedTransaction({ orderId: 0 });
    const tx2 = createTestOrderedTransaction({ orderId: 1 });

    const tx1Copy: OrderedTransaction = {
      orderId: 0,
      data: new Transaction(tx1.data.raw),
    };
    const tx2Copy: OrderedTransaction = {
      orderId: 1,
      data: new Transaction(tx2.data.raw),
    };

    tx1.data.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
    tx2.data.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

    tx1Copy.data.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
    tx2Copy.data.sign(toBuffer(DEFAULT_ACCOUNTS[1].privateKey));

    const actualMap: Map<string, OrderedTransaction[]> = new Map();
    actualMap.set(bufferToHex(tx1.data.getSenderAddress()), [tx1, tx2]);

    const expectedMap = new Map(actualMap);
    expectedMap.set(bufferToHex(tx1.data.getSenderAddress()), [
      tx1Copy,
      tx2Copy,
    ]);
    expectedMap.set(bufferToHex(tx2.data.getSenderAddress()), [tx1]);

    assert.throws(() => {
      assertEqualTransactionMaps(actualMap, expectedMap);
    });
  });

  it("throws if maps have the same size but the elements don't match", async () => {
    // Actual:
    // A -> [1, 2]
    // C -> []
    // Expected:
    // A -> [1, 2]
    // D -> []

    const tx1 = createTestOrderedTransaction({ orderId: 0 });
    const tx2 = createTestOrderedTransaction({ orderId: 1 });

    const tx1Copy: OrderedTransaction = {
      orderId: 0,
      data: new Transaction(tx1.data.raw),
    };
    const tx2Copy: OrderedTransaction = {
      orderId: 1,
      data: new Transaction(tx2.data.raw),
    };

    tx1.data.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
    tx2.data.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

    tx1Copy.data.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
    tx2Copy.data.sign(toBuffer(DEFAULT_ACCOUNTS[1].privateKey));

    const actualMap: Map<string, OrderedTransaction[]> = new Map();
    actualMap.set(bufferToHex(tx1.data.getSenderAddress()), [tx1, tx2]);
    actualMap.set(bufferToHex(randomAddressBuffer()), []);

    const expectedMap = new Map(actualMap);
    expectedMap.set(bufferToHex(tx1.data.getSenderAddress()), [
      tx1Copy,
      tx2Copy,
    ]);
    actualMap.set(bufferToHex(randomAddressBuffer()), []);

    assert.throws(() => {
      assertEqualTransactionMaps(actualMap, expectedMap);
    });
  });

  it("throws if one of map values don't match", async () => {
    // Actual:
    // A -> [1, 3]
    // B -> [1]
    // Expected:
    // A -> [1, 2]
    // B -> [1]

    const tx1 = createTestOrderedTransaction({ orderId: 0 });
    const tx2 = createTestOrderedTransaction({ orderId: 1 });
    const tx3 = createTestOrderedTransaction({ orderId: 2 });

    const tx1Copy: OrderedTransaction = {
      orderId: 0,
      data: new Transaction(tx1.data.raw),
    };
    const tx2Copy: OrderedTransaction = {
      orderId: 1,
      data: new Transaction(tx2.data.raw),
    };

    tx1.data.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
    tx2.data.sign(toBuffer(DEFAULT_ACCOUNTS[1].privateKey));
    tx3.data.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

    tx1Copy.data.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
    tx2Copy.data.sign(toBuffer(DEFAULT_ACCOUNTS[1].privateKey));

    const actualMap: Map<string, OrderedTransaction[]> = new Map();
    actualMap.set(bufferToHex(tx1.data.getSenderAddress()), [tx1, tx3]);
    actualMap.set(bufferToHex(tx2.data.getSenderAddress()), [tx1]);

    const expectedMap = new Map(actualMap);
    expectedMap.set(bufferToHex(tx1.data.getSenderAddress()), [
      tx1Copy,
      tx2Copy,
    ]);
    expectedMap.set(bufferToHex(tx2.data.getSenderAddress()), [tx1Copy]);

    assert.throws(() => {
      assertEqualTransactionMaps(actualMap, expectedMap);
    });
  });
});

describe("assertEqualTransactionLists", () => {
  it("does not throw if the lists have the same content", async () => {
    const tx1 = createTestOrderedTransaction({ orderId: 0 });
    const tx2 = createTestOrderedTransaction({ orderId: 1 });
    const tx1Copy: OrderedTransaction = {
      orderId: 0,
      data: new Transaction(tx1.data.raw),
    };
    const tx2Copy: OrderedTransaction = {
      orderId: 1,
      data: new Transaction(tx2.data.raw),
    };

    assert.doesNotThrow(() =>
      assertEqualTransactionLists([tx1, tx2], [tx1Copy, tx2Copy])
    );
  });

  it("throws if the order of elements in lists is not the same", async () => {
    const tx1 = createTestOrderedTransaction({ orderId: 0 });
    const tx2 = createTestOrderedTransaction({ orderId: 1 });
    const tx1Copy: OrderedTransaction = {
      orderId: 0,
      data: new Transaction(tx1.data.raw),
    };
    const tx2Copy: OrderedTransaction = {
      orderId: 1,
      data: new Transaction(tx2.data.raw),
    };

    assert.throws(() =>
      assertEqualTransactionLists([tx1, tx2], [tx2Copy, tx1Copy])
    );
  });

  it("throws if the lists don't have the same content", async () => {
    const tx1 = createTestOrderedTransaction({ orderId: 0 });
    const tx2 = createTestOrderedTransaction({ orderId: 1 });
    const tx1Copy: OrderedTransaction = {
      orderId: 0,
      data: new Transaction(tx1.data.raw),
    };

    assert.throws(() =>
      assertEqualTransactionLists([tx1, tx2], [tx1Copy, tx1Copy])
    );
  });

  it("throws if the lists don't have the same length", async () => {
    const tx1 = createTestOrderedTransaction({ orderId: 0 });
    const tx2 = createTestOrderedTransaction({ orderId: 1 });
    const tx1Copy: OrderedTransaction = {
      orderId: 0,
      data: new Transaction(tx1.data.raw),
    };

    assert.throws(() => assertEqualTransactionLists([tx1, tx2], [tx1Copy]));
  });
});
