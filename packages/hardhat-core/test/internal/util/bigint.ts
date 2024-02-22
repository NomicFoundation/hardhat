import { assert } from "chai";

import * as BigIntUtils from "../../../src/internal/util/bigint";

describe("BigIntUtils", function () {
  it("min", function () {
    assert.strictEqual(BigIntUtils.min(-1n, -1n), -1n);
    assert.strictEqual(BigIntUtils.min(0n, 0n), 0n);
    assert.strictEqual(BigIntUtils.min(1n, 1n), 1n);

    assert.strictEqual(BigIntUtils.min(-1n, 0n), -1n);
    assert.strictEqual(BigIntUtils.min(0n, -1n), -1n);

    assert.strictEqual(BigIntUtils.min(-1n, 1n), -1n);
    assert.strictEqual(BigIntUtils.min(1n, -1n), -1n);

    assert.strictEqual(BigIntUtils.min(0n, 1n), 0n);
    assert.strictEqual(BigIntUtils.min(1n, 0n), 0n);
  });

  it("max", function () {
    assert.strictEqual(BigIntUtils.max(-1n, -1n), -1n);
    assert.strictEqual(BigIntUtils.max(0n, 0n), 0n);
    assert.strictEqual(BigIntUtils.max(1n, 1n), 1n);

    assert.strictEqual(BigIntUtils.max(-1n, 0n), 0n);
    assert.strictEqual(BigIntUtils.max(0n, -1n), 0n);

    assert.strictEqual(BigIntUtils.max(-1n, 1n), 1n);
    assert.strictEqual(BigIntUtils.max(1n, -1n), 1n);

    assert.strictEqual(BigIntUtils.max(0n, 1n), 1n);
    assert.strictEqual(BigIntUtils.max(1n, 0n), 1n);
  });

  it("isBigInt", function () {
    assert.isTrue(BigIntUtils.isBigInt(0n));
    assert.isTrue(BigIntUtils.isBigInt(BigInt(0)));

    assert.isFalse(BigIntUtils.isBigInt(0));
    assert.isFalse(BigIntUtils.isBigInt("0"));
    assert.isFalse(BigIntUtils.isBigInt("0n"));
    assert.isFalse(BigIntUtils.isBigInt({}));
  });

  it("divUp", function () {
    assert.strictEqual(BigIntUtils.divUp(0n, 1n), 0n);
    assert.strictEqual(BigIntUtils.divUp(1n, 1n), 1n);
    assert.strictEqual(BigIntUtils.divUp(2n, 2n), 1n);

    assert.strictEqual(BigIntUtils.divUp(4n, 2n), 2n);
    assert.strictEqual(BigIntUtils.divUp(8n, 2n), 4n);
    assert.strictEqual(BigIntUtils.divUp(8n, 4n), 2n);

    assert.strictEqual(BigIntUtils.divUp(10n, 1n), 10n);
    assert.strictEqual(BigIntUtils.divUp(10n, 2n), 5n);
    assert.strictEqual(BigIntUtils.divUp(10n, 3n), 4n);
    assert.strictEqual(BigIntUtils.divUp(10n, 4n), 3n);
    assert.strictEqual(BigIntUtils.divUp(10n, 5n), 2n);
    assert.strictEqual(BigIntUtils.divUp(10n, 6n), 2n);
    assert.strictEqual(BigIntUtils.divUp(10n, 7n), 2n);
    assert.strictEqual(BigIntUtils.divUp(10n, 8n), 2n);
    assert.strictEqual(BigIntUtils.divUp(10n, 9n), 2n);
    assert.strictEqual(BigIntUtils.divUp(10n, 10n), 1n);
  });

  it("cmp", function () {
    assert.strictEqual(BigIntUtils.cmp(-1n, -1n), 0);
    assert.strictEqual(BigIntUtils.cmp(0n, 0n), 0);
    assert.strictEqual(BigIntUtils.cmp(1n, 1n), 0);

    assert.strictEqual(BigIntUtils.cmp(-1n, 0n), -1);
    assert.strictEqual(BigIntUtils.cmp(0n, -1n), 1);

    assert.strictEqual(BigIntUtils.cmp(-1n, 1n), -1);
    assert.strictEqual(BigIntUtils.cmp(1n, -1n), 1);

    assert.strictEqual(BigIntUtils.cmp(0n, 1n), -1);
    assert.strictEqual(BigIntUtils.cmp(1n, 0n), 1);
  });

  it("toEvmWord", function () {
    assert.strictEqual(
      BigIntUtils.toEvmWord(0),
      "0000000000000000000000000000000000000000000000000000000000000000"
    );
    assert.strictEqual(
      BigIntUtils.toEvmWord(1),
      "0000000000000000000000000000000000000000000000000000000000000001"
    );
    assert.strictEqual(
      BigIntUtils.toEvmWord(Number.MAX_SAFE_INTEGER),
      "000000000000000000000000000000000000000000000000001fffffffffffff"
    );

    assert.strictEqual(
      BigIntUtils.toEvmWord(0n),
      "0000000000000000000000000000000000000000000000000000000000000000"
    );
    assert.strictEqual(
      BigIntUtils.toEvmWord(1n),
      "0000000000000000000000000000000000000000000000000000000000000001"
    );
    assert.strictEqual(
      BigIntUtils.toEvmWord(17n),
      "0000000000000000000000000000000000000000000000000000000000000011"
    );
    assert.strictEqual(
      BigIntUtils.toEvmWord(1n + 256n + 256n ** 2n),
      "0000000000000000000000000000000000000000000000000000000000010101"
    );
    assert.strictEqual(
      BigIntUtils.toEvmWord(2n ** 256n - 1n),
      "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    );
  });

  it("fromBigIntLike", function () {
    assert.strictEqual(BigIntUtils.fromBigIntLike(10), 10n);
    assert.strictEqual(BigIntUtils.fromBigIntLike(11n), 11n);
    assert.strictEqual(BigIntUtils.fromBigIntLike("12"), 12n);
    assert.strictEqual(BigIntUtils.fromBigIntLike("0xd"), 13n);
    assert.strictEqual(BigIntUtils.fromBigIntLike(Buffer.from([])), 0n);
    assert.strictEqual(BigIntUtils.fromBigIntLike(Buffer.from([14])), 14n);
  });

  it("toHex", function () {
    assert.strictEqual(BigIntUtils.toHex(0), "0x0");
    assert.strictEqual(BigIntUtils.toHex(1), "0x1");
    assert.strictEqual(BigIntUtils.toHex(10), "0xa");

    assert.strictEqual(BigIntUtils.toHex(0n), "0x0");
    assert.strictEqual(BigIntUtils.toHex(1n), "0x1");
    assert.strictEqual(BigIntUtils.toHex(10n), "0xa");

    assert.strictEqual(
      BigIntUtils.toHex(2n ** 256n - 1n),
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    );

    assert.throws(() => BigIntUtils.toHex(-1));
    assert.throws(() => BigIntUtils.toHex(-1n));
  });
});
