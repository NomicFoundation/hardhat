import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatAbiValue } from "../../../../../../src/internal/builtin-plugins/hhu/tasks/abi/format.js";

const ADDRESS = "0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed";

describe("formatAbiValue", () => {
  it("formats integers in decimal and booleans as words", () => {
    assert.equal(formatAbiValue(2n ** 256n - 1n), (2n ** 256n - 1n).toString());
    assert.equal(formatAbiValue(-5n), "-5");
    assert.equal(formatAbiValue(true), "true");
    assert.equal(formatAbiValue(false), "false");
  });

  it("formats bytes as hex, and strings and addresses as they are", () => {
    assert.equal(formatAbiValue(Uint8Array.from([0xbe, 0xef])), "0xbeef");
    assert.equal(formatAbiValue(new Uint8Array()), "0x");
    assert.equal(formatAbiValue(ADDRESS), ADDRESS);
    assert.equal(formatAbiValue('say "hi"'), 'say "hi"');
  });

  it("formats arrays and tuples as JSON, with exact integers", () => {
    assert.equal(
      formatAbiValue([
        2n ** 64n,
        -1n,
        true,
        ADDRESS,
        'say "hi"',
        Uint8Array.from([0xbe, 0xef]),
        [[1n], []],
      ]),
      `[18446744073709551616,-1,true,"${ADDRESS}","say \\"hi\\"","0xbeef",[[1],[]]]`,
    );
  });
});
