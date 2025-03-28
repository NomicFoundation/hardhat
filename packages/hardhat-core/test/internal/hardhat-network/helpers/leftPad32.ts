import { setLengthLeft, toBytes } from "@ethereumjs/util";
import { assert } from "chai";

function toBuffer(x: Parameters<typeof toBytes>[0]) {
  return Buffer.from(toBytes(x));
}

export function leftPad32(value: string | Buffer | bigint): string {
  return Buffer.from(setLengthLeft(toBuffer(value), 32)).toString("hex");
}

describe("leftPad32", () => {
  it("correctly pads hex strings", () => {
    const address = "0x6b175474e89094c44da98b954eedeac495271d0f";
    assert.equal(
      leftPad32(address),
      "0000000000000000000000006b175474e89094c44da98b954eedeac495271d0f"
    );
  });

  it("correctly pads buffers", () => {
    const buffer = toBuffer("0x6b175474e89094c44da98b954eedeac495271d0f");
    assert.equal(
      leftPad32(buffer),
      "0000000000000000000000006b175474e89094c44da98b954eedeac495271d0f"
    );
  });

  it("converts to hex and correctly pads bigints", () => {
    const bn = 10n ** 18n;
    assert.equal(
      leftPad32(bn),
      "0000000000000000000000000000000000000000000000000de0b6b3a7640000"
    );
  });
});
