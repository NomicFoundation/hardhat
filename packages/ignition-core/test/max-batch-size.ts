import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assert } from "chai";

import { batches } from "../src/batches.js";
import { buildModule } from "../src/build-module.js";
import { deploy } from "../src/deploy.js";

const moduleDefinition = buildModule("Limited", (m) => {
  const a = m.contract("A");
  m.contract("B");
  m.contract("C");
  const d = m.contract("D", [], { after: [a] });
  m.contract("E", [], { after: [a] });
  m.contract("F", [], { after: [a] });
  return { d };
});

describe("maximum batch size", () => {
  it("preserves dependency layers when splitting multiple oversized batches", () => {
    assert.deepEqual(batches(moduleDefinition, 2), [
      ["Limited#A", "Limited#B"],
      ["Limited#C"],
      ["Limited#D", "Limited#E"],
      ["Limited#F"],
    ]);
  });

  it("can execute one future per batch", () => {
    assert.deepEqual(
      batches(moduleDefinition, 1),
      ["A", "B", "C", "D", "E", "F"].map((id) => [`Limited#${id}`]),
    );
  });

  for (const limit of [undefined, 3, 4, Number.MAX_SAFE_INTEGER]) {
    it(`preserves batches that fit the limit ${limit}`, () => {
      assert.deepEqual(batches(moduleDefinition, limit), [
        ["Limited#A", "Limited#B", "Limited#C"],
        ["Limited#D", "Limited#E", "Limited#F"],
      ]);
    });
  }

  for (const limit of [
    0,
    -1,
    1.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    it(`rejects invalid limit ${limit}, including for empty modules`, async () => {
      const empty = buildModule("Empty", () => ({}));
      assert.throws(() => batches(empty, limit), /maxBatchSize/);
      try {
        await deploy({
          config: { maxBatchSize: limit },
          ignitionModule: empty,
          artifactResolver: {} as any,
          provider: {} as any,
          accounts: [],
          deploymentParameters: {},
        });
        assert.fail("Expected invalid batch size to be rejected");
      } catch (error) {
        assert.isTrue(HardhatError.isHardhatError(error));
        assert.match((error as Error).message, /maxBatchSize/);
      }
    });
  }
});
