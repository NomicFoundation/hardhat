import { assert } from "chai";

import * as BigIntUtils from "../../../src/internal/util/bigint";

describe("BigIntUtils", function () {
  it("min", function () {
    assert.equal(BigIntUtils.min(-1n, -1n), -1n);
    assert.equal(BigIntUtils.min(0n, 0n), 0n);
    assert.equal(BigIntUtils.min(1n, 1n), 1n);

    assert.equal(BigIntUtils.min(-1n, 0n), -1n);
    assert.equal(BigIntUtils.min(0n, -1n), -1n);

    assert.equal(BigIntUtils.min(-1n, 1n), -1n);
    assert.equal(BigIntUtils.min(1n, -1n), -1n);

    assert.equal(BigIntUtils.min(0n, 1n), 0n);
    assert.equal(BigIntUtils.min(1n, 0n), 0n);
  });

  it("max", function () {
    assert.equal(BigIntUtils.max(-1n, -1n), -1n);
    assert.equal(BigIntUtils.max(0n, 0n), 0n);
    assert.equal(BigIntUtils.max(1n, 1n), 1n);

    assert.equal(BigIntUtils.max(-1n, 0n), 0n);
    assert.equal(BigIntUtils.max(0n, -1n), 0n);

    assert.equal(BigIntUtils.max(-1n, 1n), 1n);
    assert.equal(BigIntUtils.max(1n, -1n), 1n);

    assert.equal(BigIntUtils.max(0n, 1n), 1n);
    assert.equal(BigIntUtils.max(1n, 0n), 1n);
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
    assert.equal(BigIntUtils.divUp(0n, 1n), 0n);
    assert.equal(BigIntUtils.divUp(1n, 1n), 1n);
    assert.equal(BigIntUtils.divUp(2n, 2n), 1n);

    assert.equal(BigIntUtils.divUp(4n, 2n), 2n);
    assert.equal(BigIntUtils.divUp(8n, 2n), 4n);
    assert.equal(BigIntUtils.divUp(8n, 4n), 2n);

    assert.equal(BigIntUtils.divUp(10n, 1n), 10n);
    assert.equal(BigIntUtils.divUp(10n, 2n), 5n);
    assert.equal(BigIntUtils.divUp(10n, 3n), 4n);
    assert.equal(BigIntUtils.divUp(10n, 4n), 3n);
    assert.equal(BigIntUtils.divUp(10n, 5n), 2n);
    assert.equal(BigIntUtils.divUp(10n, 6n), 2n);
    assert.equal(BigIntUtils.divUp(10n, 7n), 2n);
    assert.equal(BigIntUtils.divUp(10n, 8n), 2n);
    assert.equal(BigIntUtils.divUp(10n, 9n), 2n);
    assert.equal(BigIntUtils.divUp(10n, 10n), 1n);
  });

  it("cmp", function () {
    assert.equal(BigIntUtils.cmp(-1n, -1n), 0);
    assert.equal(BigIntUtils.cmp(0n, 0n), 0);
    assert.equal(BigIntUtils.cmp(1n, 1n), 0);

    assert.equal(BigIntUtils.cmp(-1n, 0n), -1);
    assert.equal(BigIntUtils.cmp(0n, -1n), 1);

    assert.equal(BigIntUtils.cmp(-1n, 1n), -1);
    assert.equal(BigIntUtils.cmp(1n, -1n), 1);

    assert.equal(BigIntUtils.cmp(0n, 1n), -1);
    assert.equal(BigIntUtils.cmp(1n, 0n), 1);
  });

  it("toEvmWord", function () {
    assert.equal(
      BigIntUtils.toEvmWord(0),
      "0000000000000000000000000000000000000000000000000000000000000000"
    );
    assert.equal(
      BigIntUtils.toEvmWord(1),
      "0000000000000000000000000000000000000000000000000000000000000001"
    );
    assert.equal(
      BigIntUtils.toEvmWord(Number.MAX_SAFE_INTEGER),
      "000000000000000000000000000000000000000000000000001fffffffffffff"
    );

    assert.equal(
      BigIntUtils.toEvmWord(0n),
      "0000000000000000000000000000000000000000000000000000000000000000"
    );
    assert.equal(
      BigIntUtils.toEvmWord(1n),
      "0000000000000000000000000000000000000000000000000000000000000001"
    );
    assert.equal(
      BigIntUtils.toEvmWord(17n),
      "0000000000000000000000000000000000000000000000000000000000000011"
    );
    assert.equal(
      BigIntUtils.toEvmWord(1n + 256n + 256n ** 2n),
      "0000000000000000000000000000000000000000000000000000000000010101"
    );
    assert.equal(
      BigIntUtils.toEvmWord(2n ** 256n - 1n),
      "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    );
  });

  it("fromBigIntLike", function () {
    assert.equal(BigIntUtils.fromBigIntLike(10), 10n);
    assert.equal(BigIntUtils.fromBigIntLike(11n), 11n);
    assert.equal(BigIntUtils.fromBigIntLike("12"), 12n);
    assert.equal(BigIntUtils.fromBigIntLike("0xd"), 13n);
    assert.equal(BigIntUtils.fromBigIntLike(Buffer.from([])), 0n);
    assert.equal(BigIntUtils.fromBigIntLike(Buffer.from([14])), 14n);
  });

  it("toHex", function () {
    assert.equal(BigIntUtils.toHex(0), "0x0");
    assert.equal(BigIntUtils.toHex(1), "0x1");
    assert.equal(BigIntUtils.toHex(10), "0xa");

    assert.equal(BigIntUtils.toHex(0n), "0x0");
    assert.equal(BigIntUtils.toHex(1n), "0x1");
    assert.equal(BigIntUtils.toHex(10n), "0xa");

    assert.equal(
      BigIntUtils.toHex(2n ** 256n - 1n),
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    );

    assert.throws(() => BigIntUtils.toHex(-1));
    assert.throws(() => BigIntUtils.toHex(-1n));
  });
});
