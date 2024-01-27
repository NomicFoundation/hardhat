import { assert } from "chai";
import { toHex } from "../../src/internal/utils";

describe("toHex", () => {
  it("should append 0x to the supplied string value", () => {
    assert.equal(toHex("123"), "0x123");
  });

  it("should not append 0x if the supplied string value already has it", () => {
    assert.equal(toHex("0x123"), "0x123");
  });

  it("should return the 0x hex representation of the Buffer", () => {
    // "736f6d6520737472696e67".toString("hex") === "736f6d6520737472696e67"
    assert.equal(
      toHex(Buffer.from("some string", "utf8")),
      "0x736f6d6520737472696e67"
    );
  });
});
