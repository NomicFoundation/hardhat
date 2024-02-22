import { assert } from "chai";

import { Opcode } from "../../../../src/internal/hardhat-network/stack-traces/opcodes";

describe("Opcodes", function () {
  it("Should have 256 opcodes", function () {
    const opcodes = Object.keys(Opcode).filter((k) => isNaN(Number(k)));
    assert.lengthOf(opcodes, 256);
    assert.strictEqual(new Set(opcodes).size, 256);
  });
});
