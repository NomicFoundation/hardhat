import { assert } from "chai";
import { Transaction } from "ethereumjs-tx";
import { bufferToHex } from "ethereumjs-util";

import { randomAddress } from "../../../../src/internal/hardhat-network/provider/fork/random";
import { OrderedTransaction } from "../../../../src/internal/hardhat-network/provider/PoolState";

import { createTestOrderedTransaction } from "./blockchain";

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
    actual.map((tx) => tx.orderId),
    expected.map((tx) => tx.orderId)
  );
  assert.deepEqual(
    actual.map((tx) => tx.data.raw),
    expected.map((tx) => tx.data.raw)
  );
}

function cloneTransaction({
  orderId,
  data,
}: OrderedTransaction): OrderedTransaction {
  return {
    orderId,
    data: new Transaction(data.raw),
  };
}

describe("assertEqualTransactionMaps", () => {
  it("does not throw if maps are equal", async () => {
    const tx1 = createTestOrderedTransaction({ orderId: 0 });
    const tx2 = createTestOrderedTransaction({ orderId: 1 });

    const tx1Copy = cloneTransaction(tx1);
    const tx2Copy = cloneTransaction(tx2);

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

    const accountA = randomAddress();
    const accountB = randomAddress();

    const txA1 = createTestOrderedTransaction({
      orderId: 0,
      nonce: 1,
      from: accountA,
    });
    const txA2 = createTestOrderedTransaction({
      orderId: 1,
      nonce: 2,
      from: accountA,
    });
    const txB1 = createTestOrderedTransaction({
      orderId: 2,
      nonce: 1,
      from: accountB,
    });

    const txA1Copy = cloneTransaction(txA1);
    const txA2Copy = cloneTransaction(txA2);
    const txB1Copy = cloneTransaction(txB1);

    const actualMap: Map<string, OrderedTransaction[]> = new Map();
    actualMap.set(accountA, [txA1, txA2]);

    const expectedMap = new Map(actualMap);
    expectedMap.set(accountA, [txA1Copy, txA2Copy]);
    expectedMap.set(accountB, [txB1Copy]);

    assert.throws(() => {
      assertEqualTransactionMaps(actualMap, expectedMap);
    });
  });

  it("throws if maps have the same size but the elements don't match", async () => {
    // Actual:
    // A -> [1, 2]
    // B -> []
    // Expected:
    // A -> [1, 2]
    // C -> []

    const accountA = randomAddress();
    const accountB = randomAddress();
    const accountC = randomAddress();

    const txA1 = createTestOrderedTransaction({
      orderId: 0,
      nonce: 1,
      from: accountA,
    });
    const txA2 = createTestOrderedTransaction({
      orderId: 1,
      nonce: 2,
      from: accountA,
    });

    const txA1Copy = cloneTransaction(txA1);
    const txA2Copy = cloneTransaction(txA2);

    const actualMap: Map<string, OrderedTransaction[]> = new Map();
    actualMap.set(accountA, [txA1, txA2]);
    actualMap.set(accountB, []);

    const expectedMap = new Map(actualMap);
    expectedMap.set(accountA, [txA1Copy, txA2Copy]);
    actualMap.set(accountC, []);

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

    const accountA = randomAddress();
    const accountB = randomAddress();

    const txA1 = createTestOrderedTransaction({
      orderId: 0,
      nonce: 1,
      from: accountA,
    });
    const txA2 = createTestOrderedTransaction({
      orderId: 1,
      nonce: 2,
      from: accountA,
    });
    const txA3 = createTestOrderedTransaction({
      orderId: 2,
      nonce: 3,
      from: accountA,
    });
    const txB1 = createTestOrderedTransaction({
      orderId: 3,
      nonce: 1,
      from: accountB,
    });

    const txA1Copy = cloneTransaction(txA1);
    const txA2Copy = cloneTransaction(txA2);
    const txB1Copy = cloneTransaction(txB1);

    const actualMap: Map<string, OrderedTransaction[]> = new Map();
    actualMap.set(accountA, [txA1, txA3]);
    actualMap.set(accountB, [txB1]);

    const expectedMap = new Map(actualMap);
    expectedMap.set(accountA, [txA1Copy, txA2Copy]);
    expectedMap.set(accountB, [txB1Copy]);

    assert.throws(() => {
      assertEqualTransactionMaps(actualMap, expectedMap);
    });
  });
});

describe("assertEqualTransactionLists", () => {
  it("does not throw if the lists have the same content", async () => {
    const tx1 = createTestOrderedTransaction({ orderId: 0 });
    const tx2 = createTestOrderedTransaction({ orderId: 1 });
    const tx1Copy = cloneTransaction(tx1);
    const tx2Copy = cloneTransaction(tx2);

    assert.doesNotThrow(() =>
      assertEqualTransactionLists([tx1, tx2], [tx1Copy, tx2Copy])
    );
  });

  it("throws if the order of elements in lists is not the same", async () => {
    const tx1 = createTestOrderedTransaction({ orderId: 0 });
    const tx2 = createTestOrderedTransaction({ orderId: 1 });
    const tx1Copy = cloneTransaction(tx1);
    const tx2Copy = cloneTransaction(tx2);

    assert.throws(() =>
      assertEqualTransactionLists([tx1, tx2], [tx2Copy, tx1Copy])
    );
  });

  it("throws if the lists don't have the same content", async () => {
    const tx1 = createTestOrderedTransaction({ orderId: 0 });
    const tx2 = createTestOrderedTransaction({ orderId: 1 });
    const tx1Copy = cloneTransaction(tx1);

    assert.throws(() =>
      assertEqualTransactionLists([tx1, tx2], [tx1Copy, tx1Copy])
    );
  });

  it("throws if the lists don't have the same length", async () => {
    const tx1 = createTestOrderedTransaction({ orderId: 0 });
    const tx2 = createTestOrderedTransaction({ orderId: 1 });
    const tx1Copy = cloneTransaction(tx1);

    assert.throws(() => assertEqualTransactionLists([tx1, tx2], [tx1Copy]));
  });
});
