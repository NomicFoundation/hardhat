import { assert } from "chai";
import { Transaction } from "ethereumjs-tx";
import { bufferToHex, toBuffer } from "ethereumjs-util";

import { randomAddressBuffer } from "../../../../internal/hardhat-network/provider/fork/random";

import { createTestTransaction } from "./blockchain";
import { DEFAULT_ACCOUNTS } from "./providers";

export function assertEqualTransactionMaps(
  actual: Map<string, Transaction[]>,
  expected: Map<string, Transaction[]>
) {
  assert.equal(actual.size, expected.size, "Map sizes do not match");
  actual.forEach((actualList, key) => {
    const expectedList = expected.get(key);
    // assert.exists(expectedList, `Expected map doesn't have ${key} value`);
    assert.isOk(expectedList);
    assertEqualTransactionLists(actualList, expectedList!);
  });
}

export function assertEqualTransactionLists(
  actual: Transaction[],
  expected: Transaction[]
) {
  assert.deepEqual(
    actual.map((tx) => tx.raw),
    expected.map((tx) => tx.raw)
  );
}

describe("assertEqualTransactionMaps", () => {
  it("does not throw if maps are equal", async () => {
    const tx1 = createTestTransaction();
    const tx2 = createTestTransaction();
    const tx1Copy = new Transaction(tx1.raw);
    const tx2Copy = new Transaction(tx2.raw);

    tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
    tx2.sign(toBuffer(DEFAULT_ACCOUNTS[1].privateKey));
    tx1Copy.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
    tx2Copy.sign(toBuffer(DEFAULT_ACCOUNTS[1].privateKey));

    const actualMap: Map<string, Transaction[]> = new Map();
    actualMap.set(bufferToHex(tx1.getSenderAddress()), [tx1]);
    actualMap.set(bufferToHex(tx2.getSenderAddress()), [tx2]);

    const expectedMap = new Map(actualMap);
    expectedMap.set(bufferToHex(tx1.getSenderAddress()), [tx1Copy]);
    expectedMap.set(bufferToHex(tx2.getSenderAddress()), [tx2Copy]);

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

    const tx1 = createTestTransaction();
    const tx2 = createTestTransaction();

    const tx1Copy = new Transaction(tx1.raw);
    const tx2Copy = new Transaction(tx2.raw);

    tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
    tx2.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

    tx1Copy.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
    tx2Copy.sign(toBuffer(DEFAULT_ACCOUNTS[1].privateKey));

    const actualMap: Map<string, Transaction[]> = new Map();
    actualMap.set(bufferToHex(tx1.getSenderAddress()), [tx1, tx2]);

    const expectedMap = new Map(actualMap);
    expectedMap.set(bufferToHex(tx1.getSenderAddress()), [tx1Copy, tx2Copy]);
    expectedMap.set(bufferToHex(tx2.getSenderAddress()), [tx1]);

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

    const tx1 = createTestTransaction();
    const tx2 = createTestTransaction();

    const tx1Copy = new Transaction(tx1.raw);
    const tx2Copy = new Transaction(tx2.raw);

    tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
    tx2.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

    tx1Copy.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
    tx2Copy.sign(toBuffer(DEFAULT_ACCOUNTS[1].privateKey));

    const actualMap: Map<string, Transaction[]> = new Map();
    actualMap.set(bufferToHex(tx1.getSenderAddress()), [tx1, tx2]);
    actualMap.set(bufferToHex(randomAddressBuffer()), []);

    const expectedMap = new Map(actualMap);
    expectedMap.set(bufferToHex(tx1.getSenderAddress()), [tx1Copy, tx2Copy]);
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

    const tx1 = createTestTransaction();
    const tx2 = createTestTransaction();
    const tx3 = createTestTransaction();

    const tx1Copy = new Transaction(tx1.raw);
    const tx2Copy = new Transaction(tx2.raw);

    tx1.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
    tx2.sign(toBuffer(DEFAULT_ACCOUNTS[1].privateKey));
    tx3.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));

    tx1Copy.sign(toBuffer(DEFAULT_ACCOUNTS[0].privateKey));
    tx2Copy.sign(toBuffer(DEFAULT_ACCOUNTS[1].privateKey));

    const actualMap: Map<string, Transaction[]> = new Map();
    actualMap.set(bufferToHex(tx1.getSenderAddress()), [tx1, tx3]);
    actualMap.set(bufferToHex(tx2.getSenderAddress()), [tx1]);

    const expectedMap = new Map(actualMap);
    expectedMap.set(bufferToHex(tx1.getSenderAddress()), [tx1Copy, tx2Copy]);
    expectedMap.set(bufferToHex(tx2.getSenderAddress()), [tx1Copy]);

    assert.throws(() => {
      assertEqualTransactionMaps(actualMap, expectedMap);
    });
  });
});

describe("assertEqualTransactionLists", () => {
  it("does not throw if the lists have the same content", async () => {
    const tx1 = createTestTransaction();
    const tx2 = createTestTransaction();
    const tx1Copy = new Transaction(tx1.raw);
    const tx2Copy = new Transaction(tx2.raw);

    assert.doesNotThrow(() =>
      assertEqualTransactionLists([tx1, tx2], [tx1Copy, tx2Copy])
    );
  });

  it("throws if the order of elements in lists is not the same", async () => {
    const tx1 = createTestTransaction();
    const tx2 = createTestTransaction();
    const tx1Copy = new Transaction(tx1.raw);
    const tx2Copy = new Transaction(tx2.raw);

    assert.throws(() =>
      assertEqualTransactionLists([tx1, tx2], [tx2Copy, tx1Copy])
    );
  });

  it("throws if the lists don't have the same content", async () => {
    const tx1 = createTestTransaction();
    const tx2 = createTestTransaction();
    const tx1Copy = new Transaction(tx1.raw);

    assert.throws(() =>
      assertEqualTransactionLists([tx1, tx2], [tx1Copy, tx1Copy])
    );
  });

  it("throws if the lists don't have the same length", async () => {
    const tx1 = createTestTransaction();
    const tx2 = createTestTransaction();
    const tx1Copy = new Transaction(tx1.raw);

    assert.throws(() => assertEqualTransactionLists([tx1, tx2], [tx1Copy]));
  });
});
